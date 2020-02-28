/** eslint-env: node */
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { format } from "prettier";
import { JSDOM } from "jsdom";
import minimist from "minimist";
import { Editor, SchemaCompiledItemDefinition } from "../ckeditor";

let dom = new JSDOM(``, {
  url: "https://atjson.condenast.io"
});

(global as any).window = dom.window;
[
  "document",
  "location",
  "navigator",
  "localStorage",
  "DOMParser",
  "HTMLTextAreaElement",
  "Node"
].forEach(key => {
  (global as any)[key] = (dom.window as any)[key];
});

interface FileInfo {
  extension: "js" | "ts";
  parser: "babel" | "typescript";
  dir: string;
}

function classify(name: string) {
  return name[0].toUpperCase() + name.slice(1);
}

function dasherize(name: string) {
  return name.replace(/([A-Z])/g, chr => `-${chr.toLowerCase()}`);
}

function writeAnnotationFile(
  name: string,
  AnnotationClass: string,
  attributes: string[],
  { extension, dir, parser }: FileInfo
) {
  if (extension === "ts") {
    writeFileSync(
      join(dir, "annotations", `${dasherize(name)}.${extension}`),
      format(
        `
// This file is automatically generated by a script.
import { ${AnnotationClass} } from "@atjson/document";

export class ${classify(name)} extends ${AnnotationClass}${
          attributes.length
            ? `<{
  ${attributes.map(attribute => `${attribute}: unknown;`).join("\n")}
}>`
            : ""
        } {
  static vendorPrefix = "ckeditor";
  static type = "${name}";
}
`,
        { parser }
      )
    );
  } else if (extension === "js") {
    writeFileSync(
      join(dir, "annotations", `${dasherize(name)}.${extension}`),
      format(
        `
// This file is automatically generated by a script.
import { ${AnnotationClass} } from "@atjson/document";

export class ${classify(name)} extends ${AnnotationClass} {
  static vendorPrefix = "ckeditor";
  static type = "${name}";
}
`,
        { parser }
      )
    );
  }
}

function writeAnnotationIndex(
  schemas: SchemaCompiledItemDefinition[],
  { extension, dir, parser }: FileInfo
) {
  writeFileSync(
    join(dir, "annotations", `index.${extension}`),
    format(
      `${schemas
        .map(schema => `export * from "./${dasherize(schema.name)}";`)
        .join("\n")}`,
      { parser: parser }
    )
  );
}

function writeDocumentSourceFile(
  ClassName: string,
  { extension, parser, dir }: FileInfo
) {
  if (extension === "ts") {
    writeFileSync(
      join(dir, `source.${extension}`),
      format(
        `
// This file is automatically generated by a script.
import CKEditorSource, { CK } from "@atjson/source-ckeditor";
import * as annotations from "./annotations";

export default class ${ClassName} extends CKEditorSource {
  static fromRaw(model: CK.Model, rootName = "main") {
      return new this(this.fromModel(model, rootName));
  }

  static schema = [...Object.values(annotations)];
}
`,
        { parser }
      )
    );
  } else if (extension === "js") {
    writeFileSync(
      join(dir, `source.${extension}`),
      format(
        `
// This file is automatically generated by a script.
import CKEditorSource from "../../src";
import * as annotations from "./annotations";

export default class ${ClassName} extends CKEditorSource {
  static fromRaw(model, rootName = "main") {
    return new this(this.fromModel(model, rootName));
  }

  static schema = [...Object.values(annotations)];
}
    `,
        { parser }
      )
    );
  }
}

function writeModuleIndex(name: string, { extension, parser, dir }: FileInfo) {
  writeFileSync(
    join(dir, `index.${extension}`),
    format(
      `
import ${name} from "./source";
export default ${name};
    `,
      { parser }
    )
  );
}

function run() {
  const args = minimist(process.argv.slice(2), {
    string: ["out", "name", "build", "language"]
  });

  let options = {
    language: args.language || "ts",
    build: args.build || "@ckeditor/ckeditor5-build-classic",
    out: join(process.cwd(), args.out || "test"),
    name: args.name || "CKEditorClassicBuildSource"
  };

  console.info("Generating CKEditorSource with args:\n", options);

  mkdirSync(join(options.out, "annotations"), { recursive: true });

  return import(options.build).then(async (module: any) => {
    let Build = module.default as typeof Editor;
    if (!["ts", "typescript", "js", "javascript"].includes(options.language)) {
      throw new Error(`Only "js" or "ts" are supported for languages.`);
    }

    let language: "typescript" | "javascript" = ["ts", "typescript"].includes(
      options.language
    )
      ? "typescript"
      : "javascript";
    const fileInfo = {
      extension: language === "typescript" ? "ts" : "js",
      parser: language === "javascript" ? "babel" : "typescript",
      dir: options.out
    } as FileInfo;

    let div = dom.window.document.createElement("div");
    dom.window.document.body.appendChild(div);
    let editor = await Build.create(div);
    let schemaDefinition = editor.model.schema.getDefinitions();
    let schemas: SchemaCompiledItemDefinition[] = [];

    for (let key in schemaDefinition) {
      let schema = schemaDefinition[key];
      if (
        schema.name[0] === "$" &&
        schema.name !== "$root" &&
        schema.name !== "$text"
      ) {
        continue;
      }
      schemas.push(schema);
    }

    for (let schema of schemas) {
      let attributes =
        schema.allowAttributes == null
          ? []
          : Array.isArray(schema.allowAttributes)
          ? schema.allowAttributes
          : [schema.allowAttributes];

      let AnnotationClass;
      if (schema.isBlock) {
        AnnotationClass = "BlockAnnotation";
      } else if (schema.isInline) {
        AnnotationClass = "InlineAnnotation";
      } else if (schema.isObject) {
        AnnotationClass = "ObjectAnnotation";
      } else {
        AnnotationClass = "BlockAnnotation";
      }

      writeAnnotationFile(schema.name, AnnotationClass, attributes, fileInfo);
    }

    writeAnnotationIndex(schemas, fileInfo);
    writeDocumentSourceFile(options.name, fileInfo);
    writeModuleIndex(options.name, fileInfo);
  });
}

run()
  .then(() => process.exit(1))
  .catch(e => {
    console.error(e);
    process.exit(0);
  });