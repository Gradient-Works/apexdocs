# ApexDocs

<p align="center">
  <b >ApexDocs is a Node.js library with CLI capabilities to generate documentation for Salesforce Apex classes.</b>
</p>

## Description

ApexDocs was built as an alternative to the [Java based ApexDoc tool](https://github.com/SalesforceFoundation/ApexDoc) originally created by Aslam Bari and later maintained by Salesforce.org, as that tool is no longer being maintained.

ApexDocs is a Node.js library built on Typescript and hosted on [npm](https://www.npmjs.com/package/@cparra/apexdocs). It offers CLI capabilities to automatically generate a set of files that fully document each one of you classes. Additionally it can be imported and consumed directly by your JavaScript code.

There are some key differences between ApexDocs and the Java based ApexDoc tool:

- **Recursive file search through your module directory structure**. In an `sfdx` based project, all of your classes will be documented by specifying the top-most directory where file search should begin.
- **Unopinionated documentation site generation**. Instead of creating HTML files, ApexDocs generates a Markdown (.md) file per Apex class being documented. This means you can host your files in static web hosting services that parse Markdown like Github Pages or Netlify, and use site generators like Jekyll or Gatsby. This gives you the freedom to decide how to style your site to match your needs.

## Demo

- [Github Pages](https://cesarparra.github.io/apexdocs/) - Example of a site hosted in Github Pages using the generated markdown files from the CLI.

## Installation

```bash
npm i @cparra/apexdocs
```

## Usage

### CLI

| Parameter   | Alias | Description                                                                                     | Default         | Required |
| ----------- | ----- | ----------------------------------------------------------------------------------------------- | --------------- | -------- |
| --sourceDir | -s    | The directory location which contains your apex .cls classes.                                   | N/A             | Yes      |
| --targetDir | -t    | The directory location where documentation will be generated to.                                | `docs`          | No       |
| --recursive | -r    | Whether .cls classes will be searched for recursively in the directory provided.                | `true`          | No       |
| --scope     | -p    | A list of scopes to document. Values should be separated by a space, e.g --scope public private | `global public` | No       |

### Importing to your project

If you are just interested in the documentation parsing capabilities, you can import ApexDocs into your own project.

Use the `generate` function to create a list of `ClassModel` that includes all of the parsed information from your .cls files.

`generate(sourceDirectory[,recursive][,scope][,outputDir])`

- `sourceDirectory` \<string>
- `recursive` \<boolean>
- `scope` \<string[]>
- `outpurDir` \<string>

```javascript
var { generate } = require('@cparra/apexdocs');

let documentedClasses = generate('src', true, ['global'], 'docs');
```

## Typescript

ApexDocs provides all necessary type definitions.
