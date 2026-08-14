# Aurora WordPress module

Local trusted extension package for Aurora Dockside 2.0.0-alpha.24. Install the distributed `.pac` file from **Modules → Install .pac or folder**. The unpacked package directory remains installable for development. Its manifest contributes creation fields; its main-process lifecycle uses only the versioned Core context supplied by module API 1.0.0.

Uninstalling this package removes only the copy in Aurora's user-data `modules/wordpress` directory. It never removes project files or databases.
