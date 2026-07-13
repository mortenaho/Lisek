# Flathub packaging for Lisek

These files package the GitHub Release Linux tarball (`Lisek-linux.tar.gz`) for [Flathub](https://flathub.org), similar to how Bruno ships on Flathub.

## Files

| File | Purpose |
|------|---------|
| `com.lisek.app.yml` | Flatpak manifest |
| `com.lisek.app.metainfo.xml` | AppStream metadata |
| `com.lisek.app.desktop` | Desktop entry |
| `com.lisek.app.png` | 512×512 app icon |
| `apply_extra.sh` | Extracts the release tarball into `/app/extra` |
| `flathub.json` | x86_64-only (no aarch64 Linux build yet) |

App ID: **`com.lisek.app`**

## Build and test locally

```bash
# Install Flatpak builder tooling
flatpak remote-add --if-not-exists --user flathub https://dl.flathub.org/repo/flathub.flatpakrepo
flatpak install -y --user flathub org.flatpak.Builder \
  org.freedesktop.Platform//25.08 \
  org.freedesktop.Sdk//25.08 \
  org.electronjs.Electron2.BaseApp//25.08

cd flatpak
flatpak run --command=flathub-build org.flatpak.Builder --install com.lisek.app.yml
flatpak run com.lisek.app

# Lint
flatpak run --command=flatpak-builder-lint org.flatpak.Builder manifest com.lisek.app.yml
```

## Submit to Flathub

1. Fork and clone [flathub/flathub](https://github.com/flathub/flathub) (use the `new-pr` branch workflow from [Flathub submission docs](https://docs.flathub.org/docs/for-app-authors/submission)).
2. Copy every file in this directory to the submission branch root (manifest must sit at repo root).
3. Open the submission pull request against `flathub/flathub`.
4. After acceptance, Flathub creates `flathub/com.lisek.app` — future version bumps go there.

## Updating a release

When you publish a new GitHub release with `Lisek-linux.tar.gz`:

1. Update `url`, `sha256`, and `size` under `extra-data` in `com.lisek.app.yml`.
2. Add a `<release>` entry in `com.lisek.app.metainfo.xml`.
3. Open a PR on `flathub/com.lisek.app`.

```bash
curl -sL -o /tmp/Lisek-linux.tar.gz \
  "https://github.com/mortenaho/Lisek/releases/download/vX.Y.Z/Lisek-linux.tar.gz"
sha256sum /tmp/Lisek-linux.tar.gz
stat -c%s /tmp/Lisek-linux.tar.gz
```

## Notes

- Linux CI currently ships **x86_64** only (`flathub.json`). Add aarch64 assets before removing that restriction.
- App data lives under `~/.var/app/com.lisek.app/` (Flatpak sandbox), not the host `~/.config/Lisek` used by AppImage/RPM.
- Prefer keeping the stable download name `Lisek-linux.tar.gz` on every release so Flathub updates stay simple.
