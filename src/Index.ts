/// <reference path="Functions.ts" />
/// <reference path="Generators.ts" />
/// <reference path="Iterators.ts" />
/// <reference path="Enumerable.ts" />

namespace Linq {

    export const Version = "0.0.1";
}

if(typeof module !== "undefined") {
    module.exports = Linq;
}

//export as namespace;
