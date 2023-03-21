import sys
from .builder import SwaggerBuilder
from .fix_schema import patch_extends


if len(sys.argv) < 2:
    print("Must pass one or more config files to process")
    sys.exit()


patch_extends()

for filename in sys.argv[1:]:
    SwaggerBuilder().build_from_config(config_filename=filename)
