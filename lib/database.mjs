import {readFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';

export async function openDatabase(url=process.env.DATABASE_URL){
  let query,close,transaction;
  const convert=sql=>{let n=0;return sql.replace(/\?/g,()=>'$'+(++n))};
  const adapter=execute=>({prepare(sql){return {args:[],bind(...args){this.args=args;return this},async first(){return (await execute(sql,this.args))[0]||null},async all(){return {results:await execute(sql,this.args)}},async run(){return execute(sql,this.args)}}}});
  const schema=readFileSync(new URL('../schema.sql',import.meta.url),'utf8');
  if(url){
    const {default:pg}=await import('pg');
    // PostgreSQL returns COUNT and ROW_NUMBER as bigint strings by default.
    // Keep the same numeric API contract as the local SQLite adapter.
    pg.types.setTypeParser(20,value=>{const number=Number(value);if(!Number.isSafeInteger(number))throw new Error('Database integer exceeds safe range');return number;});
    const pool=new pg.Pool({connectionString:url,max:5,connectionTimeoutMillis:10000,idleTimeoutMillis:30000});
    pool.on('error',()=>console.error('Database connection interrupted'));
    await pool.query(schema);
    query=async(sql,args)=>{let n=0;const result=await pool.query(sql.replace(/\?/g,()=>'$'+(++n)),args);return result.rows;};
    close=()=>pool.end();
    transaction=async fn=>{const client=await pool.connect();try{await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(58310422)');const scoped=adapter(async(sql,args)=>(await client.query(convert(sql),args)).rows);scoped.lockSuffix=' FOR UPDATE';const value=await fn(scoped);await client.query('COMMIT');return value;}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release()}};
  }else{
    if(process.env.RENDER)throw new Error('DATABASE_URL is required on Render');
    const {DatabaseSync}=await import('node:sqlite');
    const file=process.env.SQLITE_PATH||'data/academy.sqlite';
    if(file!==':memory:')mkdirSync(dirname(file),{recursive:true});
    const sqlite=new DatabaseSync(file);sqlite.exec(schema);
    const execute=async(sql,args)=>{const statement=sqlite.prepare(sql);return statement.columns().length?statement.all(...args):(statement.run(...args),[]);};
    let queue=Promise.resolve();query=(sql,args)=>{const operation=queue.then(()=>execute(sql,args));queue=operation.catch(()=>{});return operation;};
    close=async()=>{await queue;sqlite.close()};
    transaction=fn=>{const operation=queue.then(async()=>{sqlite.exec('BEGIN IMMEDIATE');try{const result=await fn({...adapter(execute),lockSuffix:''});sqlite.exec('COMMIT');return result;}catch(error){sqlite.exec('ROLLBACK');throw error;}});queue=operation.catch(()=>{});return operation;};
  }
  return {close,transaction,...adapter(query)};
}
