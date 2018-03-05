var fs = require('fs');
var glob = require('glob');
var mkpath = require('mkpath');
var path = require('path');
var XmlReader = require('xml-reader-datatest');

function writeFile(filepath, content) {
    mkpath.sync(path.dirname(filepath));
    fs.writeFileSync(filepath, content);
}

function gatherXlfPackage(location) {
    var package = [];

    var xlfPaths = glob.sync(location + '/*/*/*.xlf');
    xlfPaths.forEach((path, i) => {
        var langLoc = path.split('/');
        langLoc = langLoc.slice(langLoc.length - 3, langLoc.length - 1).join('/');
        package.push({
            langLoc: langLoc,
            path: path,
            strings: parseXLF(fs.readFileSync(path, 'utf8'))
        });
    });
    return package;
}

function parseXLF(xlf, cb) {
    var res = XmlReader.parseSync(xlf, {
        parentNodes: false,
        dataEmitTest: (data) => {
            return true;
        }
    });
    var tunits = res.children.filter(el => { return el.type === 'element'; })[0].children.filter(el => { return el.type === 'element'; })[0].children.filter(el => { return el.name === 'trans-unit'; });
    var simpler = tunits.map(tunit => {
        var targetEl = tunit.children.find(el => { return el.name === 'target'; });
        var noteEl = tunit.children.find(el => {return el.name ==='note'; });
        var sourceEl = tunit.children.find(el => { return el.name === 'source'; });
        return {
            id: tunit.attributes.id,
            source: sourceEl.children.length ? resolveChildrenToString(sourceEl) : null,
            target: targetEl.children.length ? resolveChildrenToString(targetEl) : null,
            state: targetEl.attributes ? targetEl.attributes.state : '',
            note: noteEl && noteEl.children.length ?  noteEl.children[0].value : null
        };
    });
    return simpler;
}

function resolveChildrenToString(el) {
    return el.children.reduce((v, el) => {
        if (el.type === 'text') {
            return v + el.value;
        }
        v += `<${el.name}`;
        for (var k in el.attributes) {
            v += ` ${k}="${el.attributes[k]}"`;
        }
        return v + '/>';
    }, '');
}

module.exports = pathToPackage => {

    /*
    [
        {
            langLoc: 'de/common',
            path: 'de/common/blahblah.xlf'
            strings: [
                {
                    id: '',
                    source: '',
                    target: '',
                    state: '',
                    note: ''
                }
            ]
        }
    ]
    */

    var package = gatherXlfPackage(pathToPackage);

    return {
        getPackage: () => {
            return package;
        },
/*
[
    {
        id: '55555',
        source: '',
        allTranslated: false,
        langs: {
            'es/common': ''
        }
    }
]
*/
        getStrings: onlyTranslated => {
            var strs = [];
            package.forEach(xlf => {
                xlf.strings.forEach(s => {
                    var existing = strs.find(es => {
                        return es.id === s.id;
                    });
                    if (!existing) {
                        existing = {
                            id: s.id,
                            source: s.source,
                            langs: {}
                        };
                        strs.push(existing);
                    }
                    existing.langs[xlf.langLoc] = s.target || '';
                });
            });
            strs.forEach(s => {
                s.allTranslated = true;
                for (var k in s.langs) {
                    if (!s.langs[k] && k !== 'en/common') {
                        s.allTranslated = false;
                    }
                }
            });
            if (onlyTranslated) {
                strs = strs.filter(s => { return s.allTranslated; });
            }
            return strs;
        },
        updateString: (id, s) => {
            for (var k in s) {
                var xlf = package.find(xlf => {
                    return xlf.langLoc === k;
                });
                var so = xlf.strings.find(so => {
                    return so.id === id;
                });
                if (so) {
                    so.target = s[k];
                    so.state = !!so.target;
                }
                else {
                    console.log(`String with ID ${id} not found!`);
                }
            }
        },
        write: basePath => {
            basePath = basePath || pathToPackage;
            if (basePath[basePath.length-1] !== '/') {
                basePath += '/';
            }

            package.forEach(xlf => {
                var pathParts = xlf.path.split('/');
                var path = basePath + xlf.langLoc + '/' + pathParts[pathParts.length-1];

                var xml =
`<?xml version="1.0" encoding="utf-8"?><xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <file datatype="x-soy-msg-bundle" original="SoyMsgBundle" source-language="en" target-language="${xlf.langLoc}" xml:space="preserve">
    <body>`;

                xlf.strings.forEach(s => {

                    xml += `
      <trans-unit datatype="html" id="${s.id}">
        <source>${s.source}</source>
        <target` +
        (s.target ? ` state="${s.state ? 'translated' : ''}">${s.target ? s.target : ''}</target>\n` : '/>\n') +
        (s.note ? `        <note>${s.note}</note>\n` : '') +
      `      </trans-unit>`;

                });

                xml += `
    </body>
  </file>
</xliff>
`;
                writeFile(path, xml);
            });
        }
    };
};