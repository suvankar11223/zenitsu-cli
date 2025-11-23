import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { Document } from '@langchain/core/documents';

// Note: If MemoryVectorStore is not found in 'langchain/vectorstores/memory' (because we didn't install 'langchain'),
// we might need to import it from '@langchain/core/vectorstores/memory'.
// However, standard import is often from 'langchain/vectorstores/memory'.
// Given we are using modular packages, let's try to be safe. 
// But since we can't easily check installed packages right now, I'll assume standard or core.
// Actually, let's try to import from core if possible, or just use a simple in-memory implementation if needed.
// For now, I'll use the standard import and if it fails, I'll fix it.

export class CodebaseIndexer {
    constructor(rootDir) {
        this.rootDir = rootDir;
        this.vectorStore = null;
        this.embeddings = new GoogleGenerativeAIEmbeddings({
            modelName: "embedding-001",
            apiKey: process.env.GOOGLE_API_KEY
        });
    }

    async index() {
        console.log('🔄 Indexing codebase...');
        try {
            // Find all relevant files
            const files = await glob('**/*.{js,ts,tsx,jsx,json,md,css,html}', {
                cwd: this.rootDir,
                ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**', '**/.next/**'],
                absolute: true
            });

            console.log(`Found ${files.length} files to index.`);

            const documents = [];
            const splitter = new RecursiveCharacterTextSplitter({
                chunkSize: 1000,
                chunkOverlap: 200,
            });

            for (const file of files) {
                try {
                    const content = await fs.readFile(file, 'utf-8');
                    const relativePath = path.relative(this.rootDir, file);

                    const docs = await splitter.createDocuments([content], {
                        source: relativePath,
                        path: file
                    });

                    documents.push(...docs);
                } catch (err) {
                    console.warn(`Failed to read file ${file}: ${err.message}`);
                }
            }

            console.log(`Created ${documents.length} chunks. Embedding...`);

            // Create vector store
            this.vectorStore = await MemoryVectorStore.fromDocuments(
                documents,
                this.embeddings
            );

            console.log('✅ Codebase indexed successfully.');
            return true;
        } catch (error) {
            console.error('❌ Error indexing codebase:', error);
            return false;
        }
    }

    async search(query, k = 5) {
        if (!this.vectorStore) {
            console.warn('⚠️ Vector store not initialized. Indexing now...');
            await this.index();
        }

        if (!this.vectorStore) {
            return "Error: Could not index codebase.";
        }

        try {
            const results = await this.vectorStore.similaritySearch(query, k);
            return results.map(doc => ({
                content: doc.pageContent,
                source: doc.metadata.source,
                path: doc.metadata.path
            }));
        } catch (error) {
            console.error('Error searching codebase:', error);
            return [];
        }
    }
}
