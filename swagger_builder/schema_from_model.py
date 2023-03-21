from typing import List, Optional, Dict
import os
import re
from dataclasses import dataclass


def camel_to_snake_case(camel: str) -> str:
    return re.sub('^_', '', re.sub('_+', '_', re.sub('([A-Z][a-z])', '_\\1', re.sub(r'([A-Z]+)', '_\\1', camel)))).lower()


def filename_for_type(typename: str) -> str:
    return typename[0].lower() + typename[1:]


@dataclass
class Parameter:
    name: str
    types: List[str]
    comments: List[str]


def attributes_from_implements(name: str) -> List[str]:
    with open(f"src/schemas/{filename_for_type(name)}.ts", "rt") as fp:
        lines = fp.readlines()
        return [line.split(":")[0].replace("?", "").strip() for line in lines if ":" in line]


def process_enum(name: str, lines: List[str]) -> None:
    with open(f"src/schemas/{filename_for_type(name)}.ts", "wt") as fp:
        fp.write("/**\n * Do not modify this file directly. It is automatically generated from the model definition.\n */\n")
        fp.write("\n".join(lines)+"\n")


def process_interface(lines: List[str], comments: List[str]) -> None:
    global_overrides: Dict[str, str] = {
        "models.SAN": "string",
    }
    parts = lines[0].split(" ")
    name = parts[2]

    if parts[1] == "enum":
        process_enum(name, lines)
        return

    if name in {"ListOfModels", "ModelWithAssociate", "ModelWithFilters", "RedshiftAdapterRow"}:
        return
    params: List[Parameter] = []
    imports = set()
    in_comments = False
    in_private_attributes = False
    param_comments: List[str] = []
    private_attributes: List[str] = []
    private_attribute_line = ""
    type_override: Optional[str] = None

    extends = None
    implements = None
    implements_attributes: List[str] = []

    if len(parts) >= 4 and parts[3] == "extends" and parts[4] not in {"ModelWithAssociate", "ModelWithFilters"}:
        extends = parts[4]
        imports.add(extends)
    if len(parts) >= 6 and parts[5] == "implements":
        implements = parts[6]
        imports.add(implements)
        implements_attributes = attributes_from_implements(implements)

    for line in lines[1:]:
        if "//" in line:
            idx = line.index("//")
            if idx >= 0:
                comment = line[idx + 2:].strip()
                if comment.startswith("@schema"):
                    [pragma, details] = [val.strip() for val in comment.split(":", 1)]
                    if pragma == "@schema-type-override":
                        type_override = details
                line = line[0:idx]

        line = line.strip()
        if line.startswith("/*"):
            param_comments = [line]
            in_comments = True
            continue
        elif in_comments:
            param_comments.append(line)
            if line.startswith("*/"):
                in_comments = False
            continue

        if "static privateAttributes" in line:
            private_attribute_line += line
            in_private_attributes = True
        elif in_private_attributes:
            private_attribute_line += line

        if in_private_attributes:
            if "]" in line:
                in_private_attributes = False
                start_index = private_attribute_line.rindex("[")
                end_index = private_attribute_line.rindex("]")
                if start_index and end_index:
                    private_attributes = [item.replace('"', '').strip() for item in private_attribute_line[start_index+1:(end_index)].split(",") if item]
                private_attribute_line = ""
            continue

        if "static " in line:
            continue
        if "(" in line:
            break
        if line.startswith("declare "):
            line = line[8:]

        if len(line.strip()) == 0:
            continue
        parts = line.split(":")
        if len(parts) != 2:
            if parts[-1].endswith("};"):
                parts = [parts[0], ":".join(parts[1:])]
            else:
                continue
        param_name = parts[0].strip()
        if param_name.replace("?", "") in private_attributes or param_name.replace("?", "") in implements_attributes:
            continue
        param_types: List[str] = []
        if type_override:
            parts[1] = type_override
            type_override = None
        param_type_strs = [val.strip() for val in parts[1].replace(";", "").strip().split("|")]
        for param_type in param_type_strs:
            is_array = param_type.endswith("[]")
            if is_array:
                param_type = param_type.replace("[]", "")
            if param_type in global_overrides:
                param_type = global_overrides[param_type]
            if param_type == "Date":
                param_type = "string"
            elif param_type not in {"string", "number", "boolean", "null", "object"} and not param_type.endswith("}"):
                if param_type.startswith("models."):
                    param_type = param_type[7:]
                if param_type != name:
                    imports.add(param_type)
            if is_array:
                param_type += "[]"
            param_types.append(param_type)

        params.append(Parameter(param_name, param_types, param_comments))
        param_comments = []

    with open(f"src/schemas/{filename_for_type(name)}.ts", "wt") as fp:
        fp.write("/**\n * Do not modify this file directly. It is automatically generated from the model definition.\n */\n")

        for import_interface in sorted(imports):
            fp.write(f'import {{ {import_interface} }} from "./{filename_for_type(import_interface)}";\n')
        if len(imports) > 0:
            fp.write("\n")
        if comments:
            for comment_line in comments:
                if len(comment_line) > 0 and comment_line[0] != "/":
                    comment_line = " " + comment_line
                fp.write(comment_line + "\n")
        fp.write(f"export interface {name} ")
        if extends:
            if implements:
                fp.write(f"extends {extends}, {implements} ")
            else:
                fp.write(f"extends {extends} ")
        elif implements:
            fp.write(f"extends {implements} ")
        fp.write("{\n")
        for parameter in params:
            if parameter.comments:
                for comment_line in parameter.comments:
                    if len(comment_line) > 0 and comment_line[0] != "/":
                        comment_line = " " + comment_line
                    fp.write(f"  {comment_line}\n")
            fp.write(f"  {parameter.name}: {' | '.join(parameter.types)};\n")
        fp.write("}\n")


for root, dirs, files in os.walk("src/schemas", topdown=False):
    for file in files:
        if not file.endswith(".ts"):
            continue
        interface: Optional[List[str]] = None
        comments: List[str] = []
        in_comments = False

        path = root + "/" + file
        for line in open(path, "rt"):
            line = line.rstrip()
            if line.startswith("export interface") or line.startswith("export class") or line.startswith("export enum"):
                interface = [line]
            elif interface is not None:
                interface.append(line)
                if line.startswith("}"):
                    process_interface(interface, comments)
                    interface = None
                    comments = []
            elif line.startswith("/*"):
                in_comments = True
                comments = [line.strip()]
            elif in_comments:
                line = line.strip()
                if line.startswith("*/"):
                    in_comments = False
                comments.append(line)
            elif line.startswith("function"):
                # empty any comments we have
                comments = []

