#!/bin/bash

# Install Python dependencies
pip install -r requirements.txt

# Refresh generated indexes from the published corpus
node src/build-indexes.js

# Build MkDocs site
cd website
mkdocs build -d ../site

# Return to root
cd ..
