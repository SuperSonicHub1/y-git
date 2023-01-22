import GitPersistence from "./lib/index.js"
import * as Y from "yjs"
import Git from "nodegit"

const doc = new Y.Doc(),
	repo = await Git.Repository.open('test-repo'),
	provider = new GitPersistence(repo, doc)

provider.on('synced', () => {
	const map = doc.getMap()
	map.set('counter', (map.get('counter') || 0) + 1)
	
	console.log(map.toJSON())
	
	doc.destroy()
})

