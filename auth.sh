#!/bin/bash

[ -z $1 ] && exit

echo "export const config = {authToken: '$1'}" >| ./auth.config.js
