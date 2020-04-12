# TMFColorParser

Original PHP library (v1.3c) by oorf|fuckfish (fish@stabb.de)

# Usage

### Javascript

```
const parser = new TMFColorParser();

const trackmaniaName = '$s$03Dbcs$000|$fffLodder';
parser.toHTML(trackmaniaName);
```

### PHP
```
$parser = new TMFColorParser;

$trackmaniaName = '$s$03Dbcs$000|$fffLodder';
echo $parser.toHTML($trackmaniaName)
```
