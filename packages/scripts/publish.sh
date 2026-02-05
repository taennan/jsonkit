#!/bin/bash

PACKAGE="$1"

if [ -z "$PACKAGE" ]; then
    echo "Usage: $0 <package_name>"
    exit 1
fi

if [ "$PACKAGE" != "db" ] && [ "$PACKAGE" != "tools" ]; then
    echo "Invalid package name: $PACKAGE"
    exit 1
fi

git checkout main
cd packages/$PACKAGE
npm run build
npm publish --access public
