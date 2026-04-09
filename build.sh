#!/bin/bash

# Install Python dependencies
pip install -r requirements.txt

# Build MkDocs site
cd website
mkdocs build -d ../site

# Return to root
cd ..
