/**
 * TMFColorParser v2.0.0
 *
 * @copyright   2020 Charlie Lodder
 * @license     MIT
 */

class TMFColorParser {
  constructor(autoContrastToBackgroundColor = '') {
    this.autoContrastColor(autoContrastToBackgroundColor);
    this.links = null;
    this.manialinks = null;
    this.background = null;
    this.forceDarken = false;
    this.forceBrighten = false;
    this.convert = null;
    this.alwaysDrawFontShadows = true;
  }

  replace(regex, replacement, string) {
    const re = new RegExp(regex, 'g');
    return string.replace(re, replacement);
  }

  getStyledString(str, { length }, col, wide, narrow, caps, italic, stripColors) {
    let string = str.substring(length).trim();

    if (caps) {
      string = string.toUpperCase();
    }

    if ((col || wide || narrow || italic) && (string)) {
      let styles = '';

      if (col && !stripColors) {
        const colRGB = this.get_rgb(`#${col}`);
        const colRGBNew = this.getContrastCorrectedColor(colRGB);
        let colNew = this.get_hex(colRGBNew);

        if (this.convert !== null && this.convert[0] !== null) {
          colNew = this.convertHex(colNew, this.convert[0], this.convert[1]);
        }

        styles += `color:${colNew};`;
      }

      if (italic) {
        styles += 'font-style:italic;';
      }

      if (wide) {
        styles += 'font-weight:bold;';
      }

      if (narrow) {
        styles += 'letter-spacing: -0.1em;font-size:smaller;';
      }

      string = `<span style="${styles}">${string}</span>`;
    }

    return string;
  }

  linkIsIP(link) {
    return link.match(/\\A\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}.*\\z/);
  }

  fixWWWLinks() {
    for (const key in this.links) {
      let value = this.links[key].trim();

      if (value.toLowerCase().substring(0, 4) === 'www.') {
        value = `http://${value}`;
        this.links[key] = value;
      } else if (this.linkIsIP(value)) {
        value = `http://${value}`;
        this.links[key] = value;
      }
    }
  }

  parseLinks(str, showLinks = true) {
    let string = this.parseManialinks(str, showLinks);
    string = this.replace('\\$L', '$l', string)

    this.links = {};
    let linkidx = 0;
    const chunks = string.split('$l');

    chunks.forEach((chunk, i) => {
      if (i % 2 == 1) {
        const id = `{LINK${linkidx}}`;
        linkidx += 1;

        if (chunk.match(/^\[(.*)\](.*)/)) {
          let url = chunk.substring(chunk.indexOf('[') + 1);
          url = url.substring(0, url.indexOf(']'));
          this.links[id] = url;

          if (showLinks) {
            chunks[i] = `$a${id}$x${chunk.substring(chunk.indexOf(']') + 1)}$a{/LINK}$x`;
          } else {
            chunks[i] = chunk.substring(chunk.indexOf(']') + 1)
          }
        } else {
          this.links[id] = chunk;

          if (showLinks) {
            chunks[i] = `$a${id}$x${chunk}$a{/LINK}$x`;
          }
        }
      }
    })

    this.fixWWWLinks();

    return chunks.join('');
  }

  parseManialinks(str, showLinks = true) {
    this.manialinks = {};
    const string = this.replace('\\$H', '$h', str)
    const chunks = string.split('$h');
    let linkidx = 0;
    let i = 0;

    for (i; i < chunks.length; i += 1) {
      const text = chunks[i];

      if (i % 2 == 1) {
        const id = `{MLINK${linkidx}}`;
        linkidx += 1;

        if (text.match(/\A\[(.*)\](.*)\Z/)) {
          let url = text.substring(text.indexOf('[') + 1);
          url = url.substring(0, url.indexOf(']'));
          this.manialinks[id] = url;

          if (showLinks) {
            chunks[i] = `$a${id}$x${text.substring(text.indexOf(']') + 1)}$a{/LINK}$x`;
          } else {
            chunks[i] = text.substring(text.indexOf(']') + 1)
          }
        } else {
          this.manialinks[id] = text;

          if (showLinks) {
            chunks[i] = `$a${id}$x${text}$a{/LINK}$x`;
          }
        }
      }
    }

    return chunks.join('');
  }

  insertLinks(str) {
    let string = str;

    for (const key in this.manialinks) {
      string = this.replace(key, `<a href="tmtp:///:${this.manialinks[key]}">`, string);
    }

    for (const key2 in this.links) {
      string = this.replace(key2, `<a href="${this.links[key2]}">`, string);
    }

    string = this.replace('\{/LINK\}', '</a>', string);

    return string;
  }

  getColorBrightness({r, g, b}) {
    return (r * 299 + g * 587 + b * 114) / 1000;
  }

  getBrightnessDifference(rgb1, rgb2) {
    return (Math.abs(this.getColorBrightness(rgb1) - this.getColorBrightness(rgb2)));
  }

  getColorDifference({r, g, b}, {r2, g2, b2}) {
    const rDiff = Math.abs(r - r2);
    const gDiff = Math.abs(g - g2);
    const bDiff = Math.abs(b - b2);

    return (rDiff + gDiff + bDiff) / 768 * 100;
  }

  autoContrastColor(bgColor) {
    this.background = this.get_rgb(bgColor);
  }

  replaceHex(oldHex, newHex) {
    this.convert = [oldHex, newHex];
  }

  convertHex(str, oldHex, newHex) {
    return this.replace(oldHex, newHex, string);
  }

  getContrastCorrectedColor(rgb) {
    if (!this.background) {
      return rgb;
    }

    const lighter = rgb;
    const darker = rgb;
    const diff = this.getColorDifference(rgb, this.background);
    const white = this.get_rgb('#ffffff');
    const black = this.get_rgb('#000000');

    const limit = 15;
    const steps = 50;
    let diffDarkerFromRealColor = 255;
    let diffLighterFromRealColor = 255;
    let i = 1;

    for (i; i <= steps; i += 1) {
      const diffLight = this.getColorDifference(lighter, this.background);
      const diffDark = this.getColorDifference(darker, this.background);

      if (diffLight < limit) {
        lighter.r = (steps - i) / steps * rgb.r + i / steps * white.r;
        lighter.g = (steps - i) / steps * rgb.g + i / steps * white.g;
        lighter.b = (steps - i) / steps * rgb.b + i / steps * white.b;
      } else {
        diffLighterFromRealColor = this.getColorDifference(lighter, rgb);
      }

      if (diffDark < limit) {
        darker.r = (steps - i) / steps * rgb.r + i / steps * black.r;
        darker.g = (steps - i) / steps * rgb.g + i / steps * black.g;
        darker.b = (steps - i) / steps * rgb.b + i / steps * black.b;
      } else {
        diffDarkerFromRealColor = this.getColorDifference(darker, rgb);
      }
    }

    const totalDiffLight = Math.abs(limit - this.getColorDifference(lighter, this.background));
    const totalDiffDark = Math.abs(limit - this.getColorDifference(darker, this.background));

    if (this.forceDarken) {
      return darker;
    }

    if (this.forceBrighten) {
      return lighter;
    }

    if (diffLighterFromRealColor < diffDarkerFromRealColor) {
      return lighter;
    }
    else if (diffLighterFromRealColor > diffDarkerFromRealColor) {
      return darker;
    }
    else {
      if (totalDiffDark < totalDiffLight) {
        return darker;
      }

      return lighter;
    }
  }

  toHTML(str, stripColors = false, stripLinks = false, stripTags = '') {
    let col = false;
    let wide = false;
    let narrow = false;
    let caps = false;
    let italic = false;
    let bold = false;
    let string = str;
    let tags = stripTags;

    if (tags.toLowerCase() === 'all') {
      tags = 'iwonstmgaxz';
    }

    tags.split('').forEach((tag, index) => {
      const toStrip = tags.substring(index, parseInt(index + 1, 10));
      string = this.replace(`\\$${toStrip}`, '', string);
    });

    string = this.replace('\\$\\$', '[DOLLAR]', string);
    string = this.replace(' ', '&nbsp;', string);
    string = this.parseLinks(string, !stripLinks);

    const chunks = string.split('$');
    chunks.forEach((chunk, i) => {
      let colSave;
      let wideSave;
      let narrowSave;
      let capsSave;
      let italicSave;
      let matches;

      if ((matches = chunk.match(/^[0-9a-f]{2,3}/i))) {
        col = matches[0];

        if (col.length < 3) {
          col += 8;
        }

        col = col[0] + col[0] + col[1] + col[1] + col[2] + col[2];
        chunks[i] = this.getStyledString(chunk, matches[0], col, wide, narrow, caps, italic, stripColors);
      } else if ((matches = chunk.match(/^(i)/i))) {
        italic = true;
        chunks[i] = this.getStyledString(chunk, matches[0], col, wide, narrow, caps, italic, stripColors);
      } else if ((matches = chunk.match(/^(w)/i))) {
        narrow = false;
        wide = true;
        chunks[i] = this.getStyledString(chunk, matches[0], col, wide, narrow, caps, italic, stripColors);
      } else if ((matches = chunk.match(/^(o)/i))) {
        narrow = false;
        wide = true;
        chunks[i] = this.getStyledString(chunk, matches[0], col, wide, narrow, caps, italic, stripColors);
      } else if ((matches = chunk.match(/^(n)/i))) {
        wide = false;
        narrow = true;
        chunks[i] = this.getStyledString(chunk, matches[0], col, wide, narrow, caps, italic, stripColors);
      } else if ((matches = chunk.match(/^(s)/i))) {
        chunks[i] = this.getStyledString(chunk, matches[0], col, wide, narrow, caps, italic, stripColors);
      } else if ((matches = chunk.match(/^(t)/i))) {
        caps = true;
        chunks[i] = this.getStyledString(chunk, matches[0], col, wide, narrow, caps, italic, stripColors);
      } else if ((matches = chunk.match(/^(m)/i))) {
        wide = false;
        bold = false;
        chunks[i] = this.getStyledString(chunk, matches[0], col, wide, narrow, caps, italic, stripColors);
      } else if ((matches = chunk.match(/^(g)/i))) {
        col = false;
        chunks[i] = this.getStyledString(chunk, matches[0], col, wide, narrow, caps, italic, stripColors);
      } else if ((matches = chunk.match(/^(a)/i))) {
        colSave = col;
        wideSave = wide;
        narrowSave = narrow;
        capsSave = caps;
        italicSave = italic;
        col = false;
        wide = false;
        narrow = false;
        caps = false;
        italic = false;
        chunks[i] = this.getStyledString(chunk, matches[0], col, wide, narrow, caps, italic, stripColors);
      } else if ((matches = chunk.match(/^(x)/i))) {
        col = colSave;
        wide = wideSave;
        narrow = narrowSave;
        caps = capsSave;
        italic = italicSave;

        chunks[i] = this.getStyledString(chunk, matches[0], col, wide, narrow, caps, italic, stripColors);
      } else if ((matches = chunk.match(/^(z)/i))) {
        col = false;
        wide = false;
        narrow = false;
        caps = false;
        italic = false;
        chunks[i] = this.getStyledString(chunk, matches[0], col, wide, narrow, caps, italic, stripColors);
      }
    });

    chunks.forEach((chunk, i) => {
      chunks[i] = this.replace('\[DOLLAR\]+', '$', chunk);
      chunks[i] = this.replace('&NBSP;', '&nbsp;', chunk);
    });

    string = chunks.filter(chunk => chunk.length || chunk).join('');

    string = this.insertLinks(string);

    return string;
  }

  toArray(str) {
    let col = false;
    let wide = false;
    let narrow = false;
    let caps = false;
    let italic = false;
    let shadow = false;
    let string = this.parseLinks(this.replace('\\$\\$', '[DOLLAR]', str), false);
    const chunks = string.split('$');

    const result = [];

    if (chunks[0]) {
      result[0].text = this.replace('\[DOLLAR\]+', '$', chunks[0]);
    }

    chunks.forEach((chunk, i) => {
      let match = '';
      let matches;

      if ((matches = chunk.match(/^[0-9a-f]{2,3}/i))) {
        col = matches[0];
        match = col;

        if (col.length < 3) {
          col += 9;
        }

        col = col[0] + col[0] + col[1] + col[1] + col[2] + col[2];
      } else if ((matches = chunk.match(/^(i)/i))) {
        match = matches[0];
        italic = true;
      } else if ((matches = chunk.match(/^(w)/i))) {
        match = matches[0];
        narrow = false;
        wide = true;
      } else if ((matches = chunk.match(/^(o)/i))) {
        match = matches[0];
        narrow = false;
        wide = true;
      } else if ((matches = chunk.match(/^(n)/i))) {
        match = matches[0];
        wide = false;
        narrow = true;
      } else if ((matches = chunk.match(/^(s)/i))) {
        match = matches[0];
        shadow = true;
      } else if ((matches = chunk.match(/^(t)/i))) {
        match = matches[0];
        caps = true;
      } else if ((matches = chunk.match(/^(m)/i))) {
        match = matches[0];
        wide = false;
        bold = false;
      } else if ((matches = chunk.match(/^(g)/i))) {
        match = matches[0];
        col = false;
      } else if ((matches = chunk.match(/^(x)/i))) {
        match = matches[0];
      } else if ((matches = chunk.match(/^(z)/i))) {
        match = matches[0];
        shadow = false;
        col = false;
        wide = false;
        narrow = false;
        caps = false;
        italic = false;
      }

      if (chunk.substring(match.length)) {
        const a = result.length;
        result[a].text = this.replace('\[DOLLAR\]+', '$', chunk);
        result[a].italic = italic;
        result[a].narrow = narrow;
        result[a].wide = wide;
        result[a].caps = caps;
        result[a].shadow = shadow;
        result[a].color = col;
      }
    });

    return result;
  }

  get_rgb(value) {
    const hex = value.replace('#', '');
    const rgb = {};
    rgb.r = parseInt(hex.substring(0, 2), 16);
    rgb.g = parseInt(hex.substring(2, 4), 16);
    rgb.b = parseInt(hex.substring(4, 6), 16);

    return rgb;
  }

  get_hex({r, g, b}) {
    return `#${[r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? `0${hex}` : hex;
}).join('')}`;
  }

  forceDarkerColors() {
    this.forceDarken = true;
    this.forceBrighten = false;
  }

  forceBrighterColors() {
    this.forceDarken = false;
    this.forceBrighten = true;
  }

  forceAutomaticColorCorrection() {
    this.forceDarken = false;
    this.forceBrighten = false;
  }
}
