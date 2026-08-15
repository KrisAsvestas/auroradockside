import { ipcMain, type WebContents } from 'electron'
import { spawn } from 'child_process'
import { listProjects, describeProject, getProjectRoot, unregisterProject, updateEnvironment, ensureRouter, trustAuroraCA } from '../auroraEngine'
import { runCommandStreamed } from '../commandRunner'
import { runProjectLifecycleHooks } from '../moduleRuntime'
import type { EnvironmentUpdate } from '../../shared/types'
const composeArgs=(root:string,...args:string[]):string[]=>['compose','-f',`${root}/.aurora/compose.yaml`,...args]
const allowedServices = new Set(['web','php','db','node','adminer','redis','mailpit'])
function launchTerminal(command:string,args:string[]):Promise<void>{return new Promise((resolve,reject)=>{const child=spawn(command,args,{detached:true,stdio:'ignore'});child.once('error',reject);child.once('spawn',()=>{child.unref();resolve()})})}
async function startProject(operationId:string,name:string,sender:WebContents,forceRecreate=false):Promise<void>{
 const root=await getProjectRoot(name); await updateEnvironment(root,{}); await ensureRouter()
 try { await runCommandStreamed(operationId,'docker',composeArgs(root,'up','-d','--build',...(forceRecreate?['--force-recreate']:[]),'--remove-orphans'),sender,{cwd:root,emitExit:false}); await runProjectLifecycleHooks(root,'projectStart',operationId,sender); if(!sender.isDestroyed())sender.send('terminal:exit',{operationId,exitCode:0,cancelled:false}) }
 catch(error){if(!sender.isDestroyed())sender.send('terminal:exit',{operationId,exitCode:1,cancelled:false});throw error}
}
export function registerProjectsIpc():void{
 ipcMain.handle('projects:list',()=>listProjects()); ipcMain.handle('projects:describe',(_e,name:string)=>describeProject(name))
 ipcMain.handle('projects:start',(e,id:string,name:string)=>startProject(id,name,e.sender))
 ipcMain.handle('projects:stop',async(e,id:string,name:string)=>{const root=await getProjectRoot(name);return runCommandStreamed(id,'docker',composeArgs(root,'down'),e.sender,{cwd:root})})
 ipcMain.handle('projects:restart',(e,id:string,name:string)=>startProject(id,name,e.sender,true))
 ipcMain.handle('projects:restartService',async(e,id:string,name:string,service:string)=>{if(!allowedServices.has(service))throw new Error('Invalid service');const root=await getProjectRoot(name);return runCommandStreamed(id,'docker',composeArgs(root,'restart',service),e.sender,{cwd:root})})
 ipcMain.handle('projects:phpInfo',async(e,id:string,name:string)=>{const root=await getProjectRoot(name);return runCommandStreamed(id,'docker',composeArgs(root,'exec','-T','php','php','-i'),e.sender,{cwd:root})})
 ipcMain.handle('projects:openTerminal',async(_e,name:string)=>{const root=await getProjectRoot(name);const candidates: Array<[string,string[]]>=process.platform==='linux'?[['ptyxis',['--new-window','--working-directory',root,'--title',`Aurora · ${name}`]],['x-terminal-emulator',['--new-window','--working-directory',root]],['gnome-terminal',[`--working-directory=${root}`]],['kgx',['--working-directory',root]],['konsole',['--workdir',root]]]:[];for(const [cmd,args] of candidates){try{await launchTerminal(cmd,args);return}catch{/* try the next supported terminal */}}throw new Error('No supported terminal application was found.')})
 ipcMain.handle('projects:delete',async(e,id:string,name:string,approot:string,deleteFiles:boolean)=>{
  let root=approot
 try { root=await getProjectRoot(name) } catch { /* use renderer-provided root for stale entries */ }
  try { await runProjectLifecycleHooks(root,'projectRemove',id,e.sender) } catch (error) { console.warn(`Aurora module cleanup for '${name}' failed:`, error) }
  try {
   await runCommandStreamed(id,'docker',composeArgs(root,'down','-v','--remove-orphans'),e.sender,{cwd:root})
  } catch (error) {
   // A malformed/missing compose file must never make a project undeletable.
   console.warn(`Aurora cleanup for '${name}' skipped:`, error)
  }
  await unregisterProject(name,deleteFiles)
 })
 ipcMain.handle('projects:trustCA',async()=>{ await trustAuroraCA(); await ensureRouter() })
 ipcMain.handle('projects:updateEnvironment',async(_e,_id:string,_name:string,root:string,updates:EnvironmentUpdate)=>{
  await updateEnvironment(root,updates)
})
}
