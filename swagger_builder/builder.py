from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set, Union
import re
import os
import json
import yaml
import sys


@dataclass
class RouteInfo:
    method: str
    uri: str
    is_secure: bool = True
    request_body: Optional[str] = None
    request_query: Optional[str] = None
    request_params: Optional[str] = None
    response_types: List[str] = field(default_factory=list)
    response_type: Optional[str] = None


class SwaggerBuilder:
    def __init__(self):
        self.openapi: Dict[str, Any] = {}
        self.schemas: Dict[str, Any] = {}
        self.output_filename: str = ""
        self.include_files: List[str] = []
        self.path_matcher = re.compile("router.(.*?)\(\"(.*?)\"")
        self.request_matcher = re.compile("TypedRequest(.*?)<(.*?)>")
        self.response_matcher = re.compile("TypedResponse<(.*?)>")
        self.status_matcher = re.compile("\.status\((.*?)\).json")
        self.error_matcher = re.compile("next\(new (.*?)\((.*?)[,)]")
        self.enum_matcher = re.compile("export enum (.*?) {")
        self.directory_remap = {
            "/policyTemplates": "/policytemplates",  # Yuck
        }
        self.default_tags = {
            "/identrust": ["Identrust"],
        }
        self.schemas_used: Set[str] = {"Account"}

    def load_config(self, filename: str) -> None:
        with open(filename, "rt") as fp:
            self.openapi = yaml.safe_load(fp)

        if "_output" not in self.openapi:
            print("_output must be set with the filename to output")
            sys.exit()

        if "_files" not in self.openapi:
            print("_files must be set with the list of files to include")
            sys.exit()

        self.output_filename = self.openapi.pop("_output")
        self.include_files = [file.strip().replace("./", "").replace("*.ts", "") for file in self.openapi.pop("_files")]

    def load_version(self, filename: str) -> None:
        with open(filename, "rt") as fp:
            data = json.load(fp)
            self.openapi["info"]["version"] = data["version"]

    def setup_default_security_and_paths(self) -> None:
        self.openapi["security"] = [
            {
                "OAuth2AuthorizationCodeBearer": []
            }
        ]
        self.openapi["components"] = {
            "securitySchemes": {
                "OAuth2AuthorizationCodeBearer": {
                    "type": "oauth2",
                    "flows": {
                        "authorizationCode": {
                            "scopes": {},
                            "authorizationUrl": "",
                            "tokenUrl": "/token"
                        }
                    }
                }
            },
            "schemas": {},
        }
        self.openapi["paths"] = {}

    def get_schema_for_type(self, type_name: str, mimetype: str = "application/json") -> Dict[str, Any]:
        """
        Converts a response_type to a ref component or a base type, using mimetype for encoding strings
        :param type_name: The type, which can be a base type (number, string) or a schema. If ends in [] treat as array
        :param mimetype: Optional mimetype, defaults to application/json
        :return: Dictionary with schema, referencing a component if not a base type
        """
        if mimetype == "text/csv":
            return {"type": "string", "format": "text"}

        if mimetype != "application/json":
            return {"type": "string", "format": "binary"}

        is_array = False
        if type_name.endswith("[]"):
            is_array = True
            type_name = type_name[0:-2]

        if type_name in {"number", "string", "boolean"}:
            if is_array:
                return {"type": "array", "items": {"type": type_name}}
            else:
                return {"type": type_name}
        else:
            self.schemas_used.add(type_name)

            if is_array:
                return {"type": "array", "items": {"$ref": f"#/components/schemas/{type_name}"}}
            return {"$ref": f"#/components/schemas/{type_name}"}

    def process_route(self, url_root: str, lines: List[str]) -> Optional[RouteInfo]:
        """
        Processes a route from a file, including the root URL and the block from the typescript for the route including
        path, method, request, response types
        :param url_root: root url for this route
        :param lines: lines making up the information about this route
        :return: parsed RouteInfo object
        """
        line = "".join(lines)
        matches = self.path_matcher.search(line)
        if not matches:
            return None

        route_info = RouteInfo(
            uri=url_root + matches.groups()[1],
            method=matches.groups()[0],
        )

        if "TypedRequest" in line:
            matches = self.request_matcher.search(line)
            if matches:
                type = matches.groups()[0]
                if type.startswith("User"):
                    type = type[4:]
                else:
                    route_info.is_secure = False

                if type == "Path":
                    (
                        route_info.request_body,
                        route_info.request_query,
                        route_info.request_params
                    ) = ("never", "never", matches.groups()[1])
                elif type == "Query":
                    (
                        route_info.request_body,
                        route_info.request_query,
                        route_info.request_params
                    ) = ("never", matches.groups()[1], "never")
                elif type == "Body":
                    (
                        route_info.request_body,
                        route_info.request_query,
                        route_info.request_params
                    ) = (matches.groups()[1], "never", "never")
                else:
                    in_brace = False
                    parts: List[str] = []
                    current_part: str = ""
                    for c in matches.groups()[1]:
                        if c == ',' and not in_brace:
                            parts.append(current_part.strip())
                            current_part = ""
                        else:
                            current_part += c
                            if c == '{':
                                in_brace = True
                            elif c == '}':
                                in_brace = False

                    parts.append(current_part.strip())

                    (
                        route_info.request_body,
                        route_info.request_query,
                        route_info.request_params
                    ) = parts
            route_info.request_body = route_info.request_body.replace("models.", "")

        if "TypedResponse" in line:
            matches = self.response_matcher.search(line)
            if matches:
                route_info.response_types = [result.strip().replace("models.", "") for result in matches.groups()[0].split("|")]
                route_info.response_type = route_info.response_types[0]

        return route_info

    def process_api(self) -> None:
        def process_error(line: str, error_codes: Dict[int, str]) -> None:
            matches = self.error_matcher.search(line)
            if matches:
                type = matches.groups()[0]
                status_code = status_codes.get(type, 500)
                if type == "HttpError":
                    status_code = matches.groups()[1]
                error_codes[status_code] = type

        status_codes = {
            "InvalidRequestError": 422,
            "NotAllowedError": 403,
            "NotFoundError": 404,
            "NotAuthorizedError": 401,
        }

        for root, dirs, files in os.walk("src/api", topdown=False):
            for filename in files:
                if filename == "index.ts":
                    continue
                url_root = root.replace("src/api", "")
                if url_root in self.directory_remap:
                    url_root = self.directory_remap[url_root]
                path = f"{root}/{filename}"
                for include_file in self.include_files:
                    if path.startswith(include_file):
                        break
                else:
                    continue

                error_codes: Dict[int, str] = {}

                next: Optional[List[str]] = None
                router: Optional[List[str]] = None
                route_info: Optional[RouteInfo] = None
                comments: List[str] = []
                in_comment = False
                for line in open(path):
                    line = line.rstrip()
                    if line.startswith("/**"):
                        in_comment = True
                        comments = []
                        continue
                    elif line.endswith("*/"):
                        in_comment = False
                        continue
                    if in_comment:
                        line = line[line.find("*")+1:]
                        if line and "@swagger" not in line:
                            comments.append(line)
                        continue

                    if "router." in line:
                        router = [line.strip()]
                        if ")" in line:
                            # Proceed to parsing now
                            route_info = self.process_route(url_root=url_root, lines=router)
                            router = None
                    elif router is not None:
                        router.append(line.strip())
                        if ")" in line:
                            route_info = self.process_route(url_root=url_root, lines=router)
                            router = None

                    if "next(" in line:
                        if ")" in line:
                            process_error(line, error_codes)
                        else:
                            next = [line.strip()]

                    elif next is not None:
                        next.append(line.strip())
                        if ")" in line:
                            process_error("".join(next), error_codes)
                            next = None

                    if ".status(" in line:
                        matches = self.status_matcher.search(line)
                        if matches:
                            error_codes[int(matches.groups()[0])] = "Unknown"

                if route_info is None:
                    continue

                if route_info.request_body and route_info.response_types:
                    config = yaml.safe_load("\n".join(comments)) or {}
                    mimetype = "application/json"
                    body_mimetypes = ["application/json"]
                    body_required = True
                    query_params: Dict[str, any] = {}
                    path_params: Dict[str, any] = {}

                    if route_info.uri and route_info.method:
                        # New way of loading docs
                        query_params = config.get("query", {})
                        path_params = config.get("path", {})
                        if not config.get("openapi", True):
                            continue

                        mimetype = config.get("mimetype", "application/json")
                        body_mimetypes = config.get("bodyMimetype", "application/json").split("|")
                        body_required = config.get("bodyRequired", True)
                        config = {
                            route_info.uri: {
                                route_info.method: {
                                    "summary": config.get("summary"),
                                    "tags": config.get("tags", self.default_tags.get(url_root)),
                                    "requestBody": {
                                        "description": config.get("body"),
                                    },
                                    "responses": {
                                        "200": {
                                            "description": config.get("response")
                                        }
                                    }
                                }
                            }
                        }

                    for path, path_config in config.items():
                        params: Dict[str, str] = {}
                        if route_info.request_params != "never":
                            for param in route_info.request_params[1:-1].split(";"):
                                param = param.strip()
                                if not param:
                                    continue
                                key, type = param.strip().split(':', 1)
                                key = key.strip()
                                type = type.strip()
                                params[key] = type
                                path = path.replace(f":{key}", f"{{{key}}}")

                        if path not in self.openapi["paths"]:
                            self.openapi["paths"][path] = {}

                        for verb, verb_config in path_config.items():
                            self.openapi["paths"][path][verb] = {
                                "tags": verb_config.get("tags", []),
                                "summary": verb_config.get("summary", ""),
                                "responses": {
                                    "200": {
                                        "description": verb_config.get("responses", {}).get("200", {}).get("description"),
                                        "content": {
                                            mimetype: {
                                                "schema": self.get_schema_for_type(route_info.response_types[0], mimetype),
                                            },
                                        },
                                    },
                                },
                            }
                            if not route_info.is_secure:
                                self.openapi["paths"][path][verb]["security"] = []

                            for error_code, error_description in error_codes.items():
                                self.openapi["paths"][path][verb]["responses"][error_code] = {
                                    "description": error_description,
                                    "content": {
                                        "application/json": {
                                            "schema": self.get_schema_for_type("ResultError"),
                                        },
                                    },
                                }

                            if route_info.request_body != "never":
                                self.openapi["paths"][path][verb]["requestBody"] = {
                                    "required": body_required,
                                    "description": verb_config.get("requestBody", {}).get("description"),
                                    "content": {}
                                }

                                body_types = route_info.request_body.split("|")
                                for i in range(0, min(len(body_types), len(body_mimetypes))):
                                    self.openapi["paths"][path][verb]["requestBody"]["content"][body_mimetypes[i].strip()] = {
                                        "schema": self.get_schema_for_type(body_types[i].strip()),
                                    }

                            if route_info.request_params != "never" or route_info.request_query:
                                self.openapi["paths"][path][verb]["parameters"] = []
                                for key, type in params.items():
                                    param_config = path_params.get(key, {})
                                    if key == "id" and "schema" not in param_config:
                                        schema = {"type": type, "format": "uuid"}
                                    else:
                                        schema = param_config.get("schema", {"type": type})

                                    self.openapi["paths"][path][verb]["parameters"].append({
                                        "name": key,
                                        "in": "path",
                                        "required": True,
                                        "description": param_config.get("description"),
                                        "schema": schema,
                                    })

                                if route_info.request_query != "never":
                                    for param in route_info.request_query[1:-1].split(";"):
                                        key, type = param.strip().split(':', 1)
                                        key = key.strip()
                                        required = True
                                        if key.endswith("?"):
                                            key = key[:-1]
                                            required = False
                                        type = type.strip()
                                        param_config = query_params.get(key, {})

                                        self.openapi["paths"][path][verb]["parameters"].append({
                                            "name": key,
                                            "in": "query",
                                            "required": required,
                                            "description": param_config.get("description"),
                                            "schema": param_config.get("schema", {"type": type})
                                        })

    def get_enum_values(self, lines: List[str]) -> List[Union[str, int]]:
        """
        Converts the lines in a schema enum file to a list of enums for use in openapi
        :param lines: Lines making up the enum
        :return: Array of enum values
        """
        values: List[str] = []
        for line in lines:
            is_string = True
            if '"' in line or "'" in line:
                line = line.replace('"', '').replace("'", "").strip()
            else:
                is_string = False
            if line.endswith(","):
                line = line[:-1]
            parts = [part.strip() for part in line.split("=")]
            if is_string:
                values.append(parts[1])
            else:
                values.append(int(parts[1]))
        return values

    def load_schemas(self) -> None:
        # This pulls in the previously built schema built from typeconv
        for filename in os.listdir("build"):
            if filename.startswith(".") or filename == "openapi.json":
                continue
            with open(f"build/{filename}", "rt") as fp:
                result = json.load(fp)
                for type, definition in result["components"]["schemas"].items():
                    if "properties" in definition:
                        for key, property in definition["properties"].items():
                            del definition["properties"][key]["title"]
                            if definition["properties"][key].get("type") == "array" and "title" in definition["properties"][key]["items"]:
                                del definition["properties"][key]["items"]["title"]
                            if description := definition["properties"][key].get("description"):
                                lines = description.split("\n")
                                new_lines = []
                                for line in lines:
                                    if line.startswith("@"):
                                        doc_key, doc_value = line[1:].split(" : ")
                                        if definition["properties"][key]["type"] == "array":
                                            definition["properties"][key]["items"][doc_key] = doc_value
                                        else:
                                            definition["properties"][key][doc_key] = doc_value
                                    else:
                                        new_lines.append(line)
                                if len(new_lines) > 0:
                                    if definition["properties"][key].get("type") and definition["properties"][key]["type"] == "array":
                                        definition["properties"][key]["items"]["description"] = "\n".join(new_lines)
                                        del definition["properties"][key]["description"]
                                    else:
                                        definition["properties"][key]["description"] = "\n".join(new_lines)
                                else:
                                    del definition["properties"][key]["description"]

                    del definition["title"]
                    self.schemas[type] = definition

        for filename in os.listdir("src/schemas"):
            if filename.startswith("."):
                continue
            with open(f"src/schemas/{filename}", "rt") as fp:
                enum_name: Optional[str] = None
                enum_lines: List[str] = []
                for line in fp:
                    line = line.strip()
                    if " enum " in line:
                        enum_name = self.enum_matcher.match(line).groups()[0]
                        enum_lines = []
                    elif "}" in line and enum_name:
                        type = "string"
                        values = self.get_enum_values(enum_lines)
                        if len(values) > 0 and isinstance(values[0], int):
                            type = "number"
                        self.schemas[enum_name] = {
                            "type": type,
                            "enum": values,
                        }
                        enum_name = None
                    elif enum_name:
                        enum_lines.append(line)

    def add_schemas_in_use(self) -> None:
        schemas_added: Set[str] = set()

        def add_type(type: str) -> None:
            if type in schemas_added:
                return
            schemas_added.add(type)
            self.openapi["components"]["schemas"][type] = self.schemas[type]
            if "properties" in self.schemas[type]:
                for property, property_data in self.schemas[type]["properties"].items():
                    if "$ref" in property_data:
                        add_type(property_data["$ref"].replace("#/components/schemas/", ""))
                    if "items" in property_data and "$ref" in property_data["items"]:
                        add_type(property_data["items"]["$ref"].replace("#/components/schemas/", ""))

        for type in self.schemas_used:
            add_type(type)

    def sort(self) -> None:
        self.openapi["components"]["schemas"] = {key: self.openapi["components"]["schemas"][key] for key in sorted(self.openapi["components"]["schemas"].keys())}
        self.openapi["paths"] = {key: self.openapi["paths"][key] for key in sorted(self.openapi["paths"].keys())}

    def write(self) -> None:
        with open(f"swagger/{self.output_filename}", "wt") as fp:
            fp.write(json.dumps(self.openapi, indent=2))
        print(f"Wrote {self.output_filename}")

    def build_from_config(self, config_filename: str) -> None:
        self.load_config(config_filename)
        self.load_version("package.json")
        self.setup_default_security_and_paths()
        self.process_api()
        self.load_schemas()
        self.add_schemas_in_use()
        self.sort()
        self.write()
