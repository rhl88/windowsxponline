'use client'

import React from 'react'
import type { WinState } from './store'
import Explorer from './apps/Explorer'
import Notepad, { DialogBox, AboutBox } from './apps/Notepad'
import Minesweeper from './apps/Minesweeper'
import Paint from './apps/Paint'
import Calculator from './apps/Calculator'
import InternetExplorer from './apps/InternetExplorer'
import Solitaire, { DeckOptions, SolOptions } from './apps/Solitaire'
import MediaPlayer from './apps/MediaPlayer'
import TaskManager from './apps/TaskManager'
import DisplayProperties from './apps/DisplayProperties'
import RunDialog from './apps/RunDialog'
import Cmd from './apps/Cmd'
import FreeCell from './apps/FreeCell'
import Hearts from './apps/Hearts'
import WordPad from './apps/WordPad'
import Outlook, { OeCompose } from './apps/Outlook'
import Pinball from './apps/Pinball'
import { DiskClean, Defrag, SysInfo } from './apps/DiskTools'
import { OpenWith } from './apps/OpenWith'
import { ApiConfig } from './apps/ApiConfig'
import PerfOptions from './apps/PerfOptions'
import { Bmp } from './bmp'
import OnScreenKeyboard, { Magnifier, Narrator, UtilityManager, OSKIcon, MagnifierIcon, NarratorIcon, UtilManIcon } from './apps/Accessibility'
import { ControlPanel, SystemProps, UserAccounts } from './apps/ControlPanel'
import VolumeControl from './apps/VolumeControl'
import SearchApp from './apps/SearchApp'
import HelpCenter from './apps/HelpCenter'
import ImageViewer from './apps/ImageViewer'
import SoundRecorder from './apps/SoundRecorder'
import CharMap from './apps/CharMap'
import Clipbrd from './apps/Clipbrd'
import DateTimeProps from './apps/DateTimeProps'
import FileProps from './apps/FileProps'
import InetOptions from './apps/InetOptions'
import AddRemove from './apps/AddRemove'
import NetworkConn from './apps/NetworkConn'
import PrintersFax, { PrintQueue } from './apps/PrintersFax'
import PrintDialog from './apps/PrintDialog'
import { AdmToolsFolder, ComputerManagement, ServicesPanel, EventsPanel, PerfMon, SecuPolicy, OdbcSources } from './apps/AdminTools'
import { MyDocsProps, RecycleProps, MapDriveDialog, UnmapDriveDialog, MouseProps } from './apps/DesktopProps'
import { TaskbarProps, CustomizeNotif, CustomizeStart, CustomizeClassic, NewToolbar } from './apps/TaskbarProps'
import { SoundProps, PowerProps, KeyboardProps, IntlProps, AccessProps } from './apps/PropsDialogs'
import { FontsFolder, FontViewer, TaskSched } from './apps/FontsTasks'
import { DriveProps, FormatDialog, CheckDiskDialog } from './apps/DriveProps'
import { FolderOptions } from './apps/FolderOptions'
import DesktopItems, { DesktopCleanup } from './apps/DesktopItems'
import RegEdit from './apps/RegEdit'

import {
  MyComputerIcon, MyDocumentsIcon, NetworkIcon, IEIcon, RecycleBinIcon, FolderIcon, HardDriveIcon, FloppyDriveIcon,
} from './icons'
import {
  NotepadIcon, PaintIcon, CalculatorIcon, MineIcon, SolitaireIcon, WMPIcon, CmdIcon, TextFileIcon, RunIcon, SearchIcon, HelpIcon, TaskManagerIcon, ControlPanelIcon,
  FreeCellIcon, HeartsIcon, WordPadIcon, OutlookIcon, PinballIcon, DiskCleanIcon, DefragIcon, SysInfoIcon, UserAccountIcon, SpeakerIcon,
  SndRecIcon, CharMapIcon, ClockIcon, ImageFileIcon, FontsFolderIcon, FontFileIcon, TaskSchedIcon,
} from './app-icons'

export interface AppEntry {
  component: React.FC<{ win: WinState }>
  icon: React.FC<{ size?: number; className?: string }>
  resizable?: boolean
}

export const APP_REGISTRY: Record<string, AppEntry> = {
  explorer: { component: Explorer, icon: MyComputerIcon, resizable: true },
  notepad: { component: Notepad, icon: NotepadIcon, resizable: true },
  minesweeper: { component: Minesweeper, icon: MineIcon, resizable: false },
  paint: { component: Paint, icon: PaintIcon, resizable: true },
  calculator: { component: Calculator, icon: CalculatorIcon, resizable: false },
  ie: { component: InternetExplorer, icon: IEIcon, resizable: true },
  solitaire: { component: Solitaire, icon: SolitaireIcon, resizable: true },
  deckopts: { component: DeckOptions, icon: SolitaireIcon, resizable: false },
  solopts: { component: SolOptions, icon: SolitaireIcon, resizable: false },
  wmp: { component: MediaPlayer, icon: WMPIcon, resizable: true },
  taskmgr: { component: TaskManager, icon: TaskManagerIcon, resizable: true },
  display: { component: DisplayProperties, icon: ControlPanelIcon, resizable: false },
  run: { component: RunDialog, icon: RunIcon, resizable: false },
  cmd: { component: Cmd, icon: CmdIcon, resizable: true },
  dialog: { component: DialogBox, icon: () => <></>, resizable: false },
  about: { component: AboutBox, icon: () => <></>, resizable: false },
  freecell: { component: FreeCell, icon: FreeCellIcon, resizable: true },
  hearts: { component: Hearts, icon: HeartsIcon, resizable: false },
  wordpad: { component: WordPad, icon: WordPadIcon, resizable: true },
  outlook: { component: Outlook, icon: OutlookIcon, resizable: true },
  oecompose: { component: OeCompose, icon: OutlookIcon, resizable: true },
  pinball: { component: Pinball, icon: PinballIcon, resizable: false },
  diskclean: { component: DiskClean, icon: DiskCleanIcon, resizable: false },
  defrag: { component: Defrag, icon: DefragIcon, resizable: false },
  sysinfo: { component: SysInfo, icon: SysInfoIcon, resizable: true },
  controlpanel: { component: ControlPanel, icon: ControlPanelIcon, resizable: true },
  sysprops: { component: SystemProps, icon: SysInfoIcon, resizable: false },
  useraccounts: { component: UserAccounts, icon: UserAccountIcon, resizable: false },
  volume: { component: VolumeControl, icon: SpeakerIcon, resizable: false },
  search: { component: SearchApp, icon: SearchIcon, resizable: true },
  helpcenter: { component: HelpCenter, icon: HelpIcon, resizable: true },
  imgviewer: { component: ImageViewer, icon: ImageFileIcon, resizable: true },
  sndrec: { component: SoundRecorder, icon: SndRecIcon, resizable: false },
  charmap: { component: CharMap, icon: CharMapIcon, resizable: true },
  clipbrd: { component: Clipbrd, icon: CharMapIcon, resizable: true },
  datetime: { component: DateTimeProps, icon: ClockIcon, resizable: false },
  fileprops: { component: FileProps, icon: (p) => <TextFileIcon {...p} />, resizable: false },
  inetopts: { component: InetOptions, icon: ControlPanelIcon, resizable: false },
  addremove: { component: AddRemove, icon: ControlPanelIcon, resizable: false },
  netconn: { component: NetworkConn, icon: ControlPanelIcon, resizable: true },
  printfax: { component: PrintersFax, icon: ControlPanelIcon, resizable: true },
  printqueue: { component: PrintQueue, icon: ControlPanelIcon, resizable: true },
  print: { component: PrintDialog, icon: ControlPanelIcon, resizable: false },
  admintools: { component: AdmToolsFolder, icon: ControlPanelIcon, resizable: true },
  compmgmt: { component: ComputerManagement, icon: ControlPanelIcon, resizable: true },
  services: { component: ServicesPanel, icon: ControlPanelIcon, resizable: true },
  eventvwr: { component: EventsPanel, icon: ControlPanelIcon, resizable: true },
  perfmon: { component: PerfMon, icon: ControlPanelIcon, resizable: true },
  secpol: { component: SecuPolicy, icon: ControlPanelIcon, resizable: true },
  odbc: { component: OdbcSources, icon: ControlPanelIcon, resizable: false },
  mydocsprops: { component: MyDocsProps, icon: ControlPanelIcon, resizable: false },
  recycleprops: { component: RecycleProps, icon: ControlPanelIcon, resizable: false },
  mapdrive: { component: MapDriveDialog, icon: ControlPanelIcon, resizable: false },
  unmapdrive: { component: UnmapDriveDialog, icon: ControlPanelIcon, resizable: false },
  mouseprops: { component: MouseProps, icon: ControlPanelIcon, resizable: false },
  soundprops: { component: SoundProps, icon: ControlPanelIcon, resizable: false },
  powerprops: { component: PowerProps, icon: ControlPanelIcon, resizable: false },
  keyboardprops: { component: KeyboardProps, icon: ControlPanelIcon, resizable: false },
  intlprops: { component: IntlProps, icon: ControlPanelIcon, resizable: false },
  accessprops: { component: AccessProps, icon: ControlPanelIcon, resizable: false },
  fonts: { component: FontsFolder, icon: FontsFolderIcon, resizable: true },
  fontview: { component: FontViewer, icon: FontFileIcon, resizable: false },
  taskssched: { component: TaskSched, icon: TaskSchedIcon, resizable: true },
  driveprops: { component: DriveProps, icon: HardDriveIcon, resizable: false },
  format: { component: FormatDialog, icon: FloppyDriveIcon, resizable: false },
  chkdsk: { component: CheckDiskDialog, icon: HardDriveIcon, resizable: false },
  taskbarprops: { component: TaskbarProps, icon: ControlPanelIcon, resizable: false },
  customnotif: { component: CustomizeNotif, icon: ControlPanelIcon, resizable: false },
  deskitems: { component: DesktopItems, icon: ControlPanelIcon, resizable: false },
  deskcleanup: { component: DesktopCleanup, icon: ControlPanelIcon, resizable: false },
  customstart: { component: CustomizeStart, icon: ControlPanelIcon, resizable: false },
  customclassic: { component: CustomizeClassic, icon: ControlPanelIcon, resizable: false },
  newtoolbar: { component: NewToolbar, icon: ControlPanelIcon, resizable: false },
  osk: { component: OnScreenKeyboard, icon: OSKIcon, resizable: true },
  regedit: { component: RegEdit, icon: (p) => <Bmp name="regedit" size={p.size} />, resizable: true },
  openwith: { component: OpenWith, icon: TextFileIcon, resizable: false },
  folderoptions: { component: FolderOptions, icon: (p) => <Bmp name="cp-folderopts" size={p.size} />, resizable: false },
  apicfg: { component: ApiConfig, icon: (p) => <Bmp name="adm-odbc" size={p.size} />, resizable: false },
  perfopts: { component: PerfOptions, icon: ControlPanelIcon, resizable: false },
  magnifier: { component: Magnifier, icon: MagnifierIcon, resizable: false },
  narrator: { component: Narrator, icon: NarratorIcon, resizable: true },
  utilman: { component: UtilityManager, icon: UtilManIcon, resizable: false },
}

/* 图标键查找（供任务栏/窗口使用 fallback） */
export const FALLBACK_ICON = TextFileIcon
