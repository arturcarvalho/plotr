# npm install -g cl,jsoc
cloc --exclude-dir=node_modules,out,scripts,.webpack,ggsql-wasm --exclude-ext=json,md,js --not-match-f='\.test\.(ts|tsx|js|jsx)$' .
