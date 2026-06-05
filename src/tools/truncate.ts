
const default_max_byte = 50 * 1024;


export function truncateByBytes(text: string, maxBytes: number = default_max_byte): string {

  const buffer = Buffer.from(text, "utf-8");

  if (buffer.length <= maxBytes) {
    return text;
    
  }


  const truncatedBuffer = buffer.subarray(0, maxBytes);

  const safeString = truncatedBuffer.toString('utf-8');

  return safeString + `\n\n [System Warning: File was too massive. It was brutally truncated at ${maxBytes / 1024}KB to prevent LLM
        memory overload.]`
}