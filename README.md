# magnitide.com

The landing site for [Magnitide](https://github.com/obscuredetour/magnitide), served by GitHub Pages at https://magnitide.com.

Plain HTML, CSS and JavaScript, no build tooling. The interactive window on the front page is a mock of Magnitide's main window; its colours come from the app's real theme files, which `build.sh` copies from a checkout of the app repo so the themes never drift.

## Preview

```bash
./build.sh ../magnitide        # or any path to a checkout of obscuredetour/magnitide
python3 -m http.server -d dist 8080
```

Then open http://localhost:8080.

## Deploy

Every push to `main` runs `.github/workflows/pages.yml`: it checks out the app repo for the theme CSS, runs `build.sh`, and publishes `dist/` to Pages. Run the workflow by hand (Actions → Pages → Run workflow) after the app's themes change.

While the app repo is private the workflow needs a repository secret `APP_REPO_TOKEN`: a fine-grained personal access token with **Contents: read** on `obscuredetour/magnitide`. Once that repo is public the `token:` line in the workflow and the secret can go.
