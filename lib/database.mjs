import {readFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';

export async function openDatabase(url=process.env.DATABASE_URL){
  let query,close;
  const schema=readFileSync(new URL('../schema.sql',import.meta.url),'utf8');
  if(url){
    const {default:pg}=await import('pg');
    const pool=new pg.Pool({connectionString:url,max:5,connectionTimeoutMillis:10000,idleTimeoutMillis:30000});
    pool.on('error',()=>console.error('Database connection interrupted'));
    await pool.query(schema);
    query=async(sql,args)=>{let n=0;const result=await pool.query(sql.replace(/\?/g,()=>'$'+(++n)),args);return result.rows;};
    close=()=>pool.end();
  }else{
    if(process.env.RENDER)throw new Error('DATABASE_URL is required on Render');
    const {DatabaseSync}=await import('node:sqlite');
    const file=process.env.SQLITE_PATH||'data/academy.sqlite';
    if(file!==':memory:')mkdirSync(dirname(file),{recursive:true});
    const sqlite=new DatabaseSync(file);sqlite.exec(schema);
    query=async(sql,args)=>{const statement=sqlite.prepare(sql);return statement.columns().length?statement.all(...args):(statement.run(...args),[]);};
    close=async()=>sqlite.close();
  }
  return {close,prepare(sql){return {args:[],bind(...args){this.args=args;return this},async first(){return (await query(sql,this.args))[0]||null},async all(){return {results:await query(sql,this.args)}},async run(){return query(sql,this.args)}}}};
}
