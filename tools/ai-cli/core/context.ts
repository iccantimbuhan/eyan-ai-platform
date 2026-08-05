import { readFileSync } from 'node:fs'
import path from 'node:path'
import { REPO_ROOT } from './repository.js'

interface RepoInfo {
  name: string
  packageManager?: string
  nodeEngine?: string
}

interface RootPackageJson {
  name?: string
  packageManager?: string
  engines?: { node?: string }
}

export function getRepoInfo(): RepoInfo {
  const pkgPath = path.join(REPO_ROOT, 'package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as RootPackageJson

  return {
    name: pkg.name ?? 'unknown',
    packageManager: pkg.packageManager,
    nodeEngine: pkg.engines?.node,
  }
}
