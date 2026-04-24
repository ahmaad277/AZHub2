import {
  createResult,
  isGuardCliEntry,
  printReport,
  readJson,
  readText,
  relativePath,
  walkFiles,
} from "./_shared.mjs";

const NAME = "check-no-random-ui-libraries";

const BANNED_PACKAGES = [
  "@mui/material",
  "@mui/icons-material",
  "@chakra-ui/react",
  "@mantine/core",
  "antd",
  "react-bootstrap",
  "bootstrap",
  "semantic-ui-react",
  "primereact",
  "grommet",
  "evergreen-ui",
  "@headlessui/react",
];

const PRIMITIVE_NAMES = new Set([
  "accordion",
  "alert-dialog",
  "button",
  "checkbox",
  "dialog",
  "dropdown-menu",
  "input",
  "label",
  "popover",
  "radio-group",
  "select",
  "separator",
  "switch",
  "tabs",
  "textarea",
  "tooltip",
]);

export async function runCheck() {
  const findings = [];
  const packageJson = readJson("package.json");
  const allDeps = {
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.devDependencies ?? {}),
  };

  for (const pkg of BANNED_PACKAGES) {
    if (allDeps[pkg]) {
      findings.push({
        file: "package.json",
        message: `Banned UI library dependency detected: ${pkg}.`,
      });
    }
  }

  const sourceFiles = [
    ...walkFiles("app", [".ts", ".tsx", ".js", ".jsx", ".mjs"]),
    ...walkFiles("components", [".ts", ".tsx", ".js", ".jsx", ".mjs"], {
      exclude: (relPath) => relPath.startsWith("components/ui/"),
    }),
    ...walkFiles("lib", [".ts", ".tsx", ".js", ".jsx", ".mjs"]),
  ];

  for (const file of sourceFiles) {
    const relPath = relativePath(file);
    const source = readText(relPath);
    for (const pkg of BANNED_PACKAGES) {
      if (
        source.includes(`"${pkg}"`) ||
        source.includes(`'${pkg}'`)
      ) {
        findings.push({
          file: relPath,
          message: `Imports banned UI library: ${pkg}.`,
        });
      }
    }
  }

  const componentFiles = walkFiles("components", [".tsx", ".ts"], {
    exclude: (relPath) => relPath.startsWith("components/ui/"),
  });
  for (const file of componentFiles) {
    const relPath = relativePath(file);
    const base = relPath.split("/").pop()?.replace(/\.(tsx|ts)$/, "") ?? "";
    if (PRIMITIVE_NAMES.has(base)) {
      findings.push({
        file: relPath,
        message:
          "Component name overlaps with a protected UI primitive; verify it is not a replacement for `components/ui/*`.",
      });
    }
  }

  return createResult(
    NAME,
    findings,
    "Report-only in Batch 2: flags banned UI libraries and suspicious primitive replacements.",
  );
}

if (isGuardCliEntry(import.meta.url)) {
  const result = await runCheck();
  printReport(result.name, result.findings, result.summary);
}
