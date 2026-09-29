/* ── 注册表编辑器（regedit）数据模型 + XP 真实种子 ──
 * 树存于 settings.regTree（虚拟根「我的电脑」+ 五大根键），用户编辑后整树落库。
 * 种子值取自真实 Windows XP SP3 常见键值（RegisteredOwner 等按本机情境化）。 */

export type RegType = 'REG_SZ' | 'REG_BINARY' | 'REG_DWORD'

export interface RegValue {
  name: string /* '' = (默认) */
  type: RegType
  data: string
}

export interface RegKey {
  name: string
  children: RegKey[]
  values: RegValue[]
}

const sz = (name: string, data: string): RegValue => ({ name, type: 'REG_SZ', data })
const dw = (name: string, data: number): RegValue => ({ name, type: 'REG_DWORD', data: `0x${(data >>> 0).toString(16).padStart(8, '0').toUpperCase()} (${data})` })
const bin = (name: string, bytes: number[]): RegValue => ({ name, type: 'REG_BINARY', data: bytes.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ') })

const k = (name: string, values: RegValue[] = [], children: RegKey[] = []): RegKey => ({ name, values, children })

/* 五大根键 + 常用分支（规模控制在 ~50 值：够真实、不臃肿） */
export function freshRegTree(): RegKey {
  return k('我的电脑', [], [
    k('HKEY_CLASSES_ROOT', [], [
      k('.txt', [sz('', 'txtfile'), sz('Content Type', 'text/plain')]),
      k('.bmp', [sz('', 'Paint.Picture')]),
      k('.jpg', [sz('', 'jpegfile'), sz('Content Type', 'image/jpeg')]),
      k('.zip', [sz('', 'CompressedFolder')]),
      k('txtfile', [sz('', '文本文档'), sz('EditFlags', '0x00010000')], [
        k('shell', [], [k('open', [], [k('command', [sz('', '%SystemRoot%\\system32\\NOTEPAD.EXE %1')])])]),
      ]),
      k('jpegfile', [sz('', 'JPEG 图像')]),
      k('Folder', [sz('', '文件夹')], [
        k('shell', [], [
          k('open', [], [k('command', [sz('', 'Explorer.exe /idlist,%I,%L')])]),
        ]),
      ]),
    ]),
    k('HKEY_CURRENT_USER', [], [
      k('Control Panel', [], [
        k('Desktop', [
          sz('', ''),
          sz('ScreenSaveActive', '1'),
          sz('ScreenSaveTimeOut', '600'),
          sz('ScreenSaverIsSecure', '0'),
          sz('Wallpaper', 'C:\\Documents and Settings\\Administrator\\Local Settings\\Application Data\\Microsoft\\Wallpaper1.bmp'),
          sz('WallpaperStyle', '2'),
          sz('TileWallpaper', '0'),
          bin('SavedPrefFlags', [0x03, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00]),
        ]),
        k('Mouse', [sz('SwapMouseButtons', '0'), sz('DoubleClickSpeed', '500')]),
        k('Keyboard', [sz('InitialKeyboardIndicators', '2'), sz('KeyboardDelay', '1'), sz('KeyboardSpeed', '31')]),
        k('Appearance', [sz('Current', 'Windows 标准')]),
      ]),
      k('Software', [], [
        k('Microsoft', [], [
          k('Windows', [], [
            k('CurrentVersion', [], [
              k('Explorer', [], [
                k('User Shell Folders', [
                  sz('Desktop', 'USERPROFILE\\桌面'),
                  sz('Favorites', 'USERPROFILE\\Favorites'),
                  sz('My Pictures', 'USERPROFILE\\My Documents\\图片收藏'),
                  sz('Personal', 'USERPROFILE\\My Documents'),
                ]),
                k('RunMRU', [sz('a', 'notepad\\1'), sz('b', 'cmd\\1'), sz('MRUList', 'ba')]),
              ]),
              k('Run', [sz('SoundMan', 'SOUNDMAN.EXE')]),
              k('Policies', [], [k('Explorer', [dw('NoDriveTypeAutoRun', 0x91)])]),
            ]),
          ]),
        ]),
      ]),
    ]),
    k('HKEY_LOCAL_MACHINE', [], [
      k('HARDWARE', [], [
        k('DESCRIPTION', [], [
          k('System', [], [
            k('CentralProcessor', [], [
              k('0', [
                sz('Identifier', 'x86 Family 15 Model 2 Stepping 9'),
                sz('VendorIdentifier', 'GenuineIntel'),
                sz('~MHz', '1993'),
                sz('ProcessorNameString', 'Intel(R) Pentium(R) 4 CPU 2.00GHz'),
              ]),
            ]),
          ]),
        ]),
      ]),
      k('SOFTWARE', [], [
        k('Microsoft', [], [
          k('Windows NT', [], [
            k('CurrentVersion', [
              sz('', ''),
              sz('ProductName', 'Microsoft Windows XP'),
              sz('CurrentVersion', '5.1'),
              sz('CurrentBuildNumber', '2600'),
              sz('CSDVersion', 'Service Pack 3'),
              sz('RegisteredOwner', 'Administrator'),
              sz('RegisteredOrganization', ''),
              sz('SystemRoot', 'C:\\WINDOWS'),
              dw('InstallDate', 1009833600),
            ]),
          ]),
          k('Windows', [], [
            k('CurrentVersion', [], [
              k('Run', [
                sz('avp', 'C:\\PROGRA~1\\Kaspersky\\avp.exe'),
                sz('SoundMan', 'SOUNDMAN.EXE'),
              ]),
              k('Explorer', [], [k('Shell Folders', [sz('Common Desktop', 'C:\\Documents and Settings\\All Users\\桌面')])]),
            ]),
          ]),
        ]),
      ]),
      k('SYSTEM', [], [
        k('CurrentControlSet', [], [
          k('Services', [], [
            k('Eventlog', [sz('Start', '2')], [
              k('Application', [sz('EventMessageFile', '%SystemRoot%\\system32\\els.dll')]),
              k('System', [sz('EventMessageFile', '%SystemRoot%\\system32\\els.dll')]),
            ]),
            k('Dhcp', [dw('Start', 2)]),
          ]),
        ]),
      ]),
    ]),
    k('HKEY_USERS', [], [
      k('.DEFAULT', [], [
        k('Control Panel', [], [k('Desktop', [sz('ScreenSaveActive', '1'), sz('Wallpaper', '(无)')])]),
      ]),
    ]),
    k('HKEY_CURRENT_CONFIG', [], [
      k('Software', [], [
        k('Fonts', [sz('FixedSys', 'SURFIX.FON')]),
        k('Microsoft', [], [k('windows', [], [k('CurrentVersion', [], [k('Internet Settings', [sz('EnableAutoProxyResultCache', '1')])])])]),
      ]),
      k('Display', [], [
        k('Fonts', [dw('Default', 15)]),
        k('Settings', [sz('Resolution', '1024,768')]),
      ]),
    ]),
  ])
}
