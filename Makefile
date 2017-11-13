all: test

deps:
	npm install

test: deps
	npm test
	
clean:
	rm -rf orbitdb/
	rm -rf node_modules/
	rm package-lock.json

.PHONY: test
