import config from '../../firebase-applet-config.json';
import { perfStorage } from '../../server';
import http from 'http';
import https from 'https';
import axios from 'axios';

// Keep connection open to massively speed up API requests (avoids TLS handshake overhead)
const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });
const apiClient = axios.create({ httpAgent, httpsAgent });

const dbId = config.firestoreDatabaseId === '(default)' ? '(default)' : config.firestoreDatabaseId;
const baseUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/${dbId}/documents`;
const key = `?key=${config.apiKey}`;

// Helper mapping
const toFirestoreType = (value: any): any => {
    if (value === null) return { nullValue: null };
    if (typeof value === 'boolean') return { booleanValue: value };
    if (typeof value === 'number') {
        if (Number.isInteger(value)) return { integerValue: String(value) };
        return { doubleValue: value };
    }
    if (typeof value === 'string') return { stringValue: value };
    // Not handling arrays/maps for this simple use case
    return { stringValue: String(value) };
};

const fromFirestoreType = (value: any): any => {
    if (value.nullValue !== undefined) return null;
    if (value.booleanValue !== undefined) return value.booleanValue;
    if (value.integerValue !== undefined) return parseInt(value.integerValue, 10);
    if (value.doubleValue !== undefined) return value.doubleValue;
    if (value.stringValue !== undefined) return value.stringValue;
    return null;
};

function recordPerf(type: 'read'|'write', start: number) {
    const perf = perfStorage?.getStore?.();
    if (perf) {
        if (type === 'read') perf.dbReadTime += (Date.now() - start);
        if (type === 'write') perf.dbWriteTime += (Date.now() - start);
    }
}

export async function restGetDoc(collection: string, id: string) {
    const start = Date.now();
    try {
        const res = await apiClient.get(`${baseUrl}/${collection}/${id}${key}`);
        recordPerf('read', start);
        const data = res.data;
        const result: any = {};
        if (data.fields) {
            for (const k in data.fields) {
                result[k] = fromFirestoreType(data.fields[k]);
            }
        }
        return result;
    } catch (err: any) {
        recordPerf('read', start);
        if (err.response && err.response.status === 404) return null;
        throw new Error(`Fetch error: ${err.message}`);
    }
}

export async function restSetDoc(collection: string, id: string, data: any) {
    const fields: any = {};
    for (const k in data) {
        if (data[k] !== undefined) fields[k] = toFirestoreType(data[k]);
    }
    const start = Date.now();
    try {
        await apiClient.patch(`${baseUrl}/${collection}/${id}${key}`, { fields });
        recordPerf('write', start);
        return true;
    } catch (err: any) {
        recordPerf('write', start);
        throw new Error(`REST Error: ${err.message}`);
    }
}

export async function restDeleteDoc(collection: string, id: string) {
    const start = Date.now();
    try {
        await apiClient.delete(`${baseUrl}/${collection}/${id}${key}`);
        recordPerf('write', start);
        return true;
    } catch (err: any) {
        recordPerf('write', start);
        if (err.response && err.response.status === 404) return true;
        throw new Error(`REST Error: ${err.message}`);
    }
}

export async function restQueryAll(collection: string, orderByField?: string, descending: boolean = true) {
    const queryPayload: any = {
      structuredQuery: {
        from: [{ collectionId: collection }],
      }
    };
    if (orderByField) {
      queryPayload.structuredQuery.orderBy = [{
        field: { fieldPath: orderByField },
        direction: descending ? "DESCENDING" : "ASCENDING"
      }];
    }
    
    const start = Date.now();
    try {
        const res = await apiClient.post(`${baseUrl}:runQuery${key}`, queryPayload);
        recordPerf('read', start);
        const data = res.data;
        
        const results: any[] = [];
        for (const item of data) {
            if (item.document && item.document.fields) {
                const result: any = { id: item.document.name.split('/').pop() };
                for (const k in item.document.fields) {
                    result[k] = fromFirestoreType(item.document.fields[k]);
                }
                results.push(result);
            }
        }
        return results;
    } catch (err: any) {
        recordPerf('read', start);
        throw new Error(`REST Error: ${err.message}`);
    }
}

export async function restQueryUserId(collection: string, fieldValue: string, fieldName: string = "uploaderId") {
    const queryPayload = {
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: {
          fieldFilter: {
            field: { fieldPath: fieldName },
            op: "EQUAL",
            value: { stringValue: fieldValue }
          }
        }
      }
    };
    
    const start = Date.now();
    try {
        const res = await apiClient.post(`${baseUrl}:runQuery${key}`, queryPayload);
        recordPerf('read', start);
        const data = res.data;
        
        const results: any[] = [];
        for (const item of data) {
            if (item.document && item.document.fields) {
                const result: any = { id: item.document.name.split('/').pop() };
                for (const k in item.document.fields) {
                    result[k] = fromFirestoreType(item.document.fields[k]);
                }
                results.push(result);
            }
        }
        return results;
    } catch (err: any) {
        recordPerf('read', start);
        throw new Error(`REST Error: ${err.message}`);
    }
}
