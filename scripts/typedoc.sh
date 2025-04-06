#!/usr/bin/env bash

npm run typedoc:generate

temp_file=$(mktemp)

input_file=./typedoc/interfaces/ModuleOptions.md
output_file=./docs/configuration/module.md

sed -E '
    s/^## (.*)$/# \1/g;      # Convert ## to #
    s/^### (.*)$/## \1/g;    # Convert ### to ##
    s/^#### (.*)$/### \1/g;    # Convert ### to ##
' "$input_file" > "$temp_file"

mv "$temp_file" "$input_file"

tail -n +13 "$input_file" > "$output_file"

sed -i '1s/^/# Module Options\n\n/' "$output_file"
rm -rf ./typedoc
