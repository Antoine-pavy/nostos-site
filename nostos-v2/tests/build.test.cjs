const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');

test('rebuilding removes leftover public files while preserving source configuration', () => {
  const source = path.resolve(__dirname, '..');
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'nostos-build-test-'));
  try {
    for (const entry of fs.readdirSync(source)) {
      if (entry === 'assets' || /\.(html|css|js|cjs|toml)$/.test(entry)) {
        fs.cpSync(path.join(source, entry), path.join(fixture, entry), { recursive: true });
      }
    }
    const config = fs.readFileSync(path.join(fixture, 'netlify.toml'), 'utf8');
    const output = path.join(fixture, 'dist');
    fs.mkdirSync(output);
    fs.writeFileSync(path.join(output, 'netlify.toml'), 'leftover configuration');
    fs.writeFileSync(path.join(output, 'private.pdf'), 'stale private resource');
    for (let run = 0; run < 2; run++) {
      execFileSync(process.execPath, [path.join(fixture, 'build.cjs'), '--production']);
      assert.ok(fs.existsSync(path.join(output, 'index.html')));
      assert.equal(fs.existsSync(path.join(output, 'netlify.toml')), false);
      assert.equal(fs.existsSync(path.join(output, 'private.pdf')), false);
      assert.equal(fs.readFileSync(path.join(fixture, 'netlify.toml'), 'utf8'), config);
    }
  } finally {
    if (path.dirname(fixture) === os.tmpdir() && path.basename(fixture).startsWith('nostos-build-test-') && !fs.lstatSync(fixture).isSymbolicLink()) {
      fs.rmSync(fixture, { recursive: true });
    }
  }
});
