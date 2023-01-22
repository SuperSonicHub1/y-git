/**
 * Sources:
 * - https://stackoverflow.com/questions/38335804/getting-all-commits-on-all-branches-with-nodegit
 * - https://www.nodegit.org/api/
 * - https://github.com/yjs/y-indexeddb/blob/217fd6da1ed12b300eba647db247af4ac1257cf2/src/y-indexeddb.js
 * - https://gist.github.com/getify/f5b111381413f9d9f4b2571c7d5822ce
 */

import { Observable } from 'lib0/observable.js'
import Git, { Commit } from "nodegit"
import * as Y from 'yjs'

function bufferToUint8Array(buffer: Buffer) {
	return new Uint8Array(buffer.buffer)
}

function uint8ArrayToBuffere(array: Uint8Array) {
	return Buffer.from(array.buffer)
}

const STORE_TIMEOUT_LENGTH = 1000

export default class GitPersistence extends Observable<string> {
	private repo: Git.Repository
	private doc: Y.Doc
	private _storeState: (update: Uint8Array, origin: any) => void
	private _destroy: () => void
	private destroyed = false
	private synced: Promise<GitPersistence>

	constructor(repo: Git.Repository, doc: Y.Doc) {
		super()

		this.repo = repo
		this.doc = doc

		this.synced = this
			.fetchUpdates()
			.then(() => {
				if (this.destroyed) return this
				this.emit('synced', [this])
				return this
			})

		this._storeState = this.storeState.bind(this)
		this.doc.on('update', this._storeState)

		this._destroy = this.destroy.bind(this)
		this.doc.on('destroy', this._destroy)
	}

	private async allCommits() {
		const walker = this.repo.createRevWalk()
		walker.pushHead()
		const commits = await walker.getCommitsUntil(() => true)
		return commits
	}

	private async getFileContentsOfAllCommitsOfFile(filePath: string) {
		const commits = await this.allCommits()
		const commitsContents = await Promise.all(commits.map(async commit => {
			const entry = await commit.getEntry(filePath),
				blob = await entry.getBlob(),
				buffer = blob.content(),
				array = bufferToUint8Array(buffer)
			return array
		}))
		// Y.js does not like empty updates
		const nonEmptyContents = commitsContents.filter(content => content.length > 0)
		return nonEmptyContents
	}

	private async fetchUpdates() {		
		const updates = await this.getFileContentsOfAllCommitsOfFile('updates')
		Y.transact(
			this.doc,
			() => updates.forEach(update => Y.applyUpdate(this.doc, update)),
			this,
			false
		)
	}

	private async storeState(update: Uint8Array, origin: any) {
		if (origin === this) return
		this.storeUpdate(update)
	}
 
	private async storeUpdate(update: Uint8Array) {
		const HEAD = await this.repo.getMasterCommit(),
			currentTree = await HEAD.getTree()

		const builder = await Git.Treebuilder.create(this.repo, currentTree)

		// Write changes
		const buffer = uint8ArrayToBuffere(update),
			oid = await Git.Blob.createFromBuffer(this.repo, buffer, buffer.length)
		await builder.insert('updates', oid, Git.TreeEntry.FILEMODE.BLOB)
		const treeOid = await builder.write()

		const author = Git.Signature.now('y-git', 'y-git@kawc.co')
		const commitOid = await this.repo.createCommit(
			"HEAD",
			author,
			author,
			`Update at ${new Date()}`,
			treeOid,
			[HEAD]
		)

		console.info(`New commit: ${oid}`)
	}

	async destroy(): Promise<void> {
		this.doc.off('update', this._storeState)
		this.doc.off('destroy', this._destroy)
		this.destroyed = true
		return this.repo.cleanup()
	}
}
