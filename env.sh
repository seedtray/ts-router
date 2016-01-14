#!/bin/bash

if [ -z "$BASH_VERSION" ]; then
	echo "Error: this script must be run via bash."
	echo "Check if /bin/bash is not a symlink to dash instead"
	return
fi
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
	echo "Error: script must be sourced, not executed"
	exit
fi

PROJECT_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")"; pwd)

PATH=${PROJECT_ROOT}/node_modules/.bin:${PATH}
export PATH

