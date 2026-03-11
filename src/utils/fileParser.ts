import * as XLSX from 'xlsx';

export interface ParsedWord {
  word: string;
  phonetic: string;
  pos: string;
  definition: string;
  example: string;
  translation: string;
}

export const parseExcel = async (file: File): Promise<ParsedWord[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        
        // Remove header row
        const rows = jsonData.slice(1);
        
        const words: ParsedWord[] = rows.map(row => ({
          word: row[0] || '',
          phonetic: row[1] || '',
          pos: row[2] || '',
          definition: row[3] || '',
          example: row[4] || '',
          translation: row[5] || ''
        })).filter(w => w.word); // Filter empty rows
        
        resolve(words);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

export const exportToExcel = (words: ParsedWord[], fileName: string) => {
  const data = [
    ['Word', 'Phonetic', 'POS', 'Definition', 'Example', 'Translation'],
    ...words.map(w => [w.word, w.phonetic, w.pos, w.definition, w.example, w.translation])
  ];
  
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Words');
  
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};
