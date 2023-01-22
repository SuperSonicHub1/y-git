# y-git

Git persistence layer for Y.js

## Install
```
npm i git+https://github.com/SuperSonicHub1/y-git
```
This project relies on NodeGit, which can be a bit of a pain to install
since you'll likely need to compile it from source: https://www.nodegit.org/guides/install/from-source/

## Usage
```ts
import GitPersistence from "y-git"
import * as Y from "yjs"
import Git from "nodegit"

const doc = new Y.Doc(),
	repo = await Git.Repository.open('repo-name'),
	provider = new GitPersistence(repo, doc)

provider.on('synced', () => {
	// Do stuff with doc here...

	// Calls provider.destroy()
	doc.destroy()
})
```

## Semantics
This library directly maps Y's update log to a Git repository's commit history.
Therefore, you get a lot of the power that Git gives you for free (although much of it is 
already given by Y because CRDTs)!
```
$ git show
commit 9127dcaa3502eaacaaf23f437c536fc7e19db750 (HEAD -> master)
Author: y-git <y-git@kawc.co>
Date:   Sun Jan 22 13:13:59 2023 -0500

    Update at Sun Jan 22 2023 13:13:59 GMT-0500 (Eastern Standard Time)

diff --git a/updates b/updates
index 8acd12c..8c6fe4a 100644
Binary files a/updates and b/updates differ
```
(If anyone knows how to derive the name of a user from a document update,
that would be very much appreciated.)

Syncing your local repo to a remote is likely best handled by a background
task which pushes every few minutes; this is an exersice left to the reader.

In order for this library to function as expected, you must have at least
one existing commit with a file `updates` on the `master` branch. See
`generate-test-repo` for more details.
