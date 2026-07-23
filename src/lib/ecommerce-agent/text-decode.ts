function replacementCount(text: string) {
  return [...text].filter((char) => char === "\uFFFD").length;
}

function decodeWithEncoding(buffer: BufferSource, encoding: string) {
  try {
    return new TextDecoder(encoding).decode(buffer);
  } catch {
    return null;
  }
}

export function decodeUploadedTableText(buffer: BufferSource) {
  const utf8Text = decodeWithEncoding(buffer, "utf-8") ?? "";
  const utf8ReplacementCount = replacementCount(utf8Text);

  if (utf8ReplacementCount === 0) {
    return utf8Text;
  }

  const fallbackTexts = ["gb18030", "gbk"]
    .map((encoding) => decodeWithEncoding(buffer, encoding))
    .filter((text): text is string => Boolean(text));
  const bestFallback = fallbackTexts
    .map((text) => ({
      text,
      replacementCount: replacementCount(text),
    }))
    .sort((a, b) => a.replacementCount - b.replacementCount)[0];

  return bestFallback && bestFallback.replacementCount < utf8ReplacementCount ? bestFallback.text : utf8Text;
}
