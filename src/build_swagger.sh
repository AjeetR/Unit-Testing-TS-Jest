#if [[ -f /opt/venv/bin/python3 ]]; then
#  /opt/venv/bin/python3 swagger_builder/schema_from_model.py
#else
#  python3 swagger_builder/schema_from_model.py
#fi

./node_modules/.bin/typeconv -f ts -t oapi --oapi-format json -o ./build src/schemas/*.ts
if [[ -f /opt/venv/bin/python3 ]]; then
  /opt/venv/bin/python3 -m swagger_builder $@
else
  python3 -m swagger_builder $@
fi
