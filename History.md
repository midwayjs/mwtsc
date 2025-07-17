
1.15.2 / 2025-07-17
===================

  * fix: compile-error-should-exit-with-abnormal-code (#38)

1.15.1 / 2024-12-25
===================

  * fix: performance npe when restart error (#36)

1.15.0 / 2024-12-08
===================

  * feat: add kill timeout args (#35)

1.14.0 / 2024-12-02
===================

  * feat: enhance performance tracking and output (#34)

1.13.0 / 2024-11-09
===================

  * feat: add perf init output (#33)
  * fix: run build throw error will not exit (#32)

1.12.0 / 2024-10-16
===================

  * feat: support inspect args (#31)

1.11.3 / 2024-10-09
===================

  * fix: using absolute paths for tsc.cmd on Windows (#30)

1.11.2 / 2024-10-09
===================

  * fix: too old version check (#28)

1.11.1 / 2024-07-14
===================

  * fix: code logic not valid (#27)

1.11.0 / 2024-07-12
===================

  * feat: add version check tip (#26)

1.10.3 / 2024-07-03
===================

  * chore: add env (#25)

1.10.2 / 2024-06-28
===================

  * fix: -p args missing (#24)

1.10.1 / 2024-06-04
===================

  * fix: stop restart when last boot fail (#23)

1.10.0 / 2024-05-16
===================

  * feat: add keepalive args (#22)

1.9.1 / 2024-05-15
==================

  * fix: windows process exit when throw error (#21)
  * docs: update api

1.9.0 / 2024-05-13
==================

  * feat: export some api for custom command (#20)

1.8.1 / 2024-05-06
==================

  * fix: directory listener after init (#19)

1.8.0 / 2024-05-04
==================

  * fix: spawn EINVAL in windows (#18)

1.7.2 / 2024-03-07
==================

  * chore: optimization kill app speed (#15)
  * chore: update readme

1.7.1 / 2024-03-02
==================

  * fix: tsconfig.json with extends config (#14)

1.7.0 / 2024-02-13
==================

  * feat: support alias path (#13)

1.6.3 / 2024-02-09
==================

  * fix: baseDir not exists when first build (#12)

1.6.2 / 2024-02-01
==================

  * fix: copy under allowjs mode (#11)


1.6.1 / 2024-01-29
==================

  * fix: copy after build (#10)

1.6.0 / 2024-01-29
==================

  * feat: support copy non-ts files (#9)

1.5.1 / 2024-01-18
==================

  * fix: json parse with tsconfig (#8)

1.5.0 / 2024-01-16
==================

  * feat: support change out dir (#7)

1.4.0 / 2024-01-14
==================

  * feat: support --cleanOutDir args (#6)

1.3.2 / 2024-01-11
==================

  * fix: source map (#5)

1.3.1 / 2024-01-09
==================

  * fix: windows exit immediate (#4)

1.3.0 / 2024-01-06
==================

  * fix: trigger child SIGINT under windows (#3)

1.2.0 / 2023-12-27
==================

  * Merge pull request #1 from midwayjs/support_change_ssl
  * chore: change https when set --ssl
  * chore: bump version

1.1.0 / 2023-11-12
==================

  * test: add more test
  * fix: ts sourcemap

1.0.1 / 2023-08-17
==================

  * fix: windows tsc cmd

1.0.0 / 2023-08-12
==================

  * feat: add output port
  * chore: change debounce time
  * fix: add debounce
  * fix: parse argv
  * chore: rename to mwtsc
  * feat: first code
  * Initial commit
