# bitburner-scripts

Collection of scripts I use in [Bitburner](https://github.com/danielyxie/bitburner)

---

To use with the 'API Server'

```
$ git clone git@github.com:s2ks/bitburner-scripts.git
$ cd bitburner-scripts

#Generate auth.config.js
$ ./auth.sh <auth token>

#To upload all scripts to the game
$ npm run upload

#To upload all scripts to the game and each script individually upon subsequent changes
$ npm run watch
```
