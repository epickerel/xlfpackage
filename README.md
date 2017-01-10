# XLF Package

Loads an XLF package for manipulation.

## Methods

### getPackage

Returns the entire package. Format is:

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
        },
        {
            langLoc: 'pt/br',
            path: 'pt/br/blahblah.xlf'
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

### getStrings [onlyTranslated]

Returns all the strings in the following format:

    [
        {
            id: '55555555555',
            source: 'blah',
            allTranslated: false,
            langs: {
                'es/common': '',
                'de/common': ''
            }
        }
    ]

### updateString <id> <langsObject>

Updates the string with the given ID with an object matching the format of langs from a getString() object.

### write [path]

Writes the xlf. Defaults to writing to the original package location.
