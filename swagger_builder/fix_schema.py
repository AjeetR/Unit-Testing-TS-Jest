import os
import json
from typing import Any, Dict, List

def patch_extends():
    interfaces_that_extend: Dict[str, str] = {}

    for filename in os.listdir("src/schemas"):
        for line in open(f"src/schemas/{filename}", "rt"):
            if "extends" in line:
                interface_name: str
                extends_name: str

                (_, __, interface_name, ___, extends_name, ____) = line.split(" ")

                interfaces_that_extend[interface_name] = extends_name
                break

    for interface_name in sorted(interfaces_that_extend.keys()):
        extends_name = interfaces_that_extend[interface_name]

        print(f"Extending {interface_name} from {extends_name}")
        interface_filename = f"build/{interface_name[0].lower()}{interface_name[1:]}.json"
        extends_filename = f"build/{extends_name[0].lower()}{extends_name[1:]}.json"

        properties: Dict[str, Any]
        required: List[str]

        with open(interface_filename, "rt") as interface_fp:
            interface_content = json.load(interface_fp)

        with open(extends_filename, "rt") as extends_fp:
            extends = json.load(extends_fp)["components"]["schemas"][extends_name]
            properties = extends["properties"]
            required = extends.get("required", [])

        interface = interface_content["components"]["schemas"][interface_name]
        for k, v in properties.items():
            if k not in interface["properties"]:
                interface["properties"][k] = v

        interface_required = interface.get("required", [])
        interface_required.extend(required)
        interface["required"] = interface_required

        with open(interface_filename, "wt") as interface_fp:
            json.dump(interface_content, interface_fp, indent=2)
