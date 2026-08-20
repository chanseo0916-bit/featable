function sectionsFromText(text: string) {
  const chunks = text.split(/\n\s*\n|(?=\[[^\]\n]{2,30}\]\s*)/).map((item) => item.trim()).filter(Boolean);
  return chunks.map((chunk) => {
    const match = chunk.match(/^\[([^\]]+)\]\s*/);
    return { heading: match?.[1], body: chunk.slice(match?.[0].length ?? 0).trim() };
  });
}

export function SemanticDescription({ text }: { text: string }) {
  return <div className="semantic-description">
    {sectionsFromText(text).map((section, index) => <section key={`${section.heading}-${index}`}>
      {section.heading && <h3>{section.heading}</h3>}
      {section.body.split(/\n+/).filter(Boolean).map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}
    </section>)}
  </div>;
}
