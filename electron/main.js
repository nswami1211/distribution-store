const {
  app,
  BrowserWindow,
} = require("electron");

const fs = require("fs");
const path = require("path");
const http = require("http");
const dotenv = require("dotenv");

let mainWindow = null;
let nextServer = null;

/**
 * Wait until the Next.js server responds.
 */
function waitForServer(
  url,
  timeout = 30000
) {
  return new Promise(
    (resolve, reject) => {
      const startedAt = Date.now();

      function check() {
        const request = http.get(
          url,
          (response) => {
            response.resume();
            resolve();
          }
        );

        request.once(
          "error",
          () => {
            retry();
          }
        );

        request.setTimeout(
          1000,
          () => {
            request.destroy();
            retry();
          }
        );
      }

      function retry() {
        if (
          Date.now() - startedAt >
          timeout
        ) {
          reject(
            new Error(
              "Next.js server did not start within 30 seconds."
            )
          );

          return;
        }

        setTimeout(
          check,
          500
        );
      }

      check();
    }
  );
}

/**
 * Start Next.js directly inside Electron.
 *
 * No child process is created.
 * No node.exe is spawned.
 * No PostgreSQL is started here.
 */
async function startNextServer() {
  const applicationPath =
    app.getAppPath();

  console.log(
    "========================================"
  );

  console.log(
    "Distribution Store starting..."
  );

  console.log(
    "Packaged:",
    app.isPackaged
  );

  console.log(
    "Application path:",
    applicationPath
  );

  console.log(
    "Resources path:",
    process.resourcesPath
  );

  console.log(
    "========================================"
  );

  /**
   * Load environment variables.
   *
   * Development:
   *   project/.env
   *
   * Packaged:
   *   resources/app/.env
   */
  const envPath =
    path.join(
      applicationPath,
      ".env"
    );

  console.log(
    ".env path:",
    envPath
  );

  if (
    fs.existsSync(envPath)
  ) {
    dotenv.config({
      path: envPath,
      override: false,
    });

    console.log(
      ".env loaded successfully."
    );
  } else {
    console.warn(
      ".env file not found."
    );
  }

  console.log(
    "DATABASE_URL configured:",
    Boolean(
      process.env.DATABASE_URL
    )
  );

  if (
    !process.env.DATABASE_URL
  ) {
    throw new Error(
      "DATABASE_URL is not configured."
    );
  }

  /**
   * Next.js location.
   */
  const nextPath =
    path.join(
      applicationPath,
      "node_modules",
      "next"
    );

  const nextPackagePath =
    path.join(
      nextPath,
      "package.json"
    );

  const nextBuildPath =
    path.join(
      applicationPath,
      ".next"
    );

  console.log(
    "Next.js path:",
    nextPath
  );

  console.log(
    "Next.js package exists:",
    fs.existsSync(
      nextPackagePath
    )
  );

  console.log(
    ".next path:",
    nextBuildPath
  );

  console.log(
    ".next exists:",
    fs.existsSync(
      nextBuildPath
    )
  );

  if (
    !fs.existsSync(
      nextPackagePath
    )
  ) {
    throw new Error(
      `Next.js package not found:\n${nextPackagePath}`
    );
  }

  if (
    !fs.existsSync(
      nextBuildPath
    )
  ) {
    throw new Error(
      `Next.js production build not found:\n${nextBuildPath}`
    );
  }

  /**
   * Load Next.js.
   */
  let next;

  try {
    next = require(
      nextPath
    );
  } catch (error) {
    console.error(
      "Failed to load Next.js:",
      error
    );

    throw error;
  }

  /**
   * Create production Next.js app.
   */
  const nextApp =
    next({
      dev: false,
      dir: applicationPath,
    });

  console.log(
    "Preparing Next.js..."
  );

  await nextApp.prepare();

  console.log(
    "Next.js prepared."
  );

  const handle =
    nextApp.getRequestHandler();

  /**
   * Create HTTP server.
   */
  nextServer =
    http.createServer(
      async (
        request,
        response
      ) => {
        try {
          await handle(
            request,
            response
          );
        } catch (error) {
          console.error(
            "Next.js request error:",
            error
          );

          if (
            !response.headersSent
          ) {
            response.statusCode =
              500;

            response.end(
              "Internal Server Error"
            );
          }
        }
      }
    );

  /**
   * Start local Next.js server.
   */
  await new Promise(
    (resolve, reject) => {
      nextServer.once(
        "error",
        reject
      );

      nextServer.listen(
        3000,
        "127.0.0.1",
        () => {
          resolve();
        }
      );
    }
  );

  console.log(
    "Next.js server started:"
  );

  console.log(
    "http://127.0.0.1:3000"
  );

  await waitForServer(
    "http://127.0.0.1:3000"
  );

  console.log(
    "Next.js is ready."
  );
}

/**
 * Create Electron window.
 */
async function createWindow() {
  try {
    await startNextServer();

    mainWindow =
      new BrowserWindow({
        width: 1400,
        height: 900,

        minWidth: 1100,
        minHeight: 700,

        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
        },

        show: false,
      });

    mainWindow.once(
      "ready-to-show",
      () => {
        mainWindow.show();
      }
    );

    mainWindow.on(
      "closed",
      () => {
        mainWindow = null;
      }
    );

    await mainWindow.loadURL(
      "http://127.0.0.1:3000"
    );
  } catch (error) {
    console.error(
      "========================================"
    );

    console.error(
      "FAILED TO START APPLICATION"
    );

    console.error(error);

    console.error(
      "========================================"
    );

    app.quit();
  }
}

/**
 * Electron startup.
 */
app.whenReady().then(
  createWindow
);

/**
 * Close application.
 */
app.on(
  "window-all-closed",
  () => {
    if (nextServer) {
      try {
        nextServer.close();
      } catch (error) {
        console.error(
          "Failed to close Next.js:",
          error
        );
      }

      nextServer = null;
    }

    if (
      process.platform !==
      "darwin"
    ) {
      app.quit();
    }
  }
);

/**
 * Final cleanup.
 */
app.on(
  "before-quit",
  () => {
    if (nextServer) {
      try {
        nextServer.close();
      } catch (error) {
        console.error(
          "Failed to close Next.js:",
          error
        );
      }

      nextServer = null;
    }
  }
);