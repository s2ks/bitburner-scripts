#!/bin/bash

[ -z $1 ] && exit

OUTPUT="export const names = [\n"

while read line; do
	OUTPUT+="\t\"${line^}\",\n"
done < $1

OUTPUT+="];"

echo -e $OUTPUT
