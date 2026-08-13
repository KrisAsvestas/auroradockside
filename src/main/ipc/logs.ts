import { ipcMain } from 'electron'
import { getProjectRoot } from '../auroraEngine'
import { startLogStream } from '../commandRunner'
export function registerLogsIpc():void{ipcMain.handle('logs:start',async(event,id:string,name:string,service:string)=>{const root=await getProjectRoot(name);startLogStream(id,'docker',['compose','-f',`${root}/.aurora/compose.yaml`,'logs','-f','--tail','200',service],event.sender,{cwd:root})})}
