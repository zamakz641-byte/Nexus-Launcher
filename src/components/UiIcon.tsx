import React from 'react';

type IconProps = React.ImgHTMLAttributes<HTMLImageElement> & { size?: number };

function icon(name: string) {
  return function NexusPngIcon({ className = '', size, alt = '', ...props }: IconProps) {
    return (
      <img
        src={`/icons/ui/${name}.png`}
        alt={alt}
        aria-hidden={alt ? undefined : true}
        draggable={false}
        width={size}
        height={size}
        className={`nexus-png-icon ${className}`}
        {...props}
      />
    );
  };
}

export const Activity = icon('Activity');
export const AlertTriangle = icon('AlertTriangle');
export const BarChart3 = icon('BarChart3');
export const Calendar = icon('Calendar');
export const CheckCircle2 = icon('CheckCircle2');
export const Clock = icon('Clock');
export const Compass = icon('Compass');
export const Database = icon('Database');
export const Film = icon('Film');
export const FolderKanban = icon('FolderKanban');
export const FolderOpen = icon('FolderOpen');
export const FolderPlus = icon('FolderPlus');
export const Gamepad2 = icon('Gamepad2');
export const Gauge = icon('Gauge');
export const Globe = icon('Globe');
export const HardDrive = icon('HardDrive');
export const HardDriveDownload = icon('HardDriveDownload');
export const Heart = icon('Heart');
export const Home = icon('Home');
export const Info = icon('Info');
export const KeyRound = icon('KeyRound');
export const Layers3 = icon('Layers3');
export const LayoutGrid = icon('LayoutGrid');
export const List = icon('List');
export const LoaderCircle = icon('LoaderCircle');
export const Lock = icon('Lock');
export const Monitor = icon('Monitor');
export const Palette = icon('Palette');
export const Pencil = icon('Pencil');
export const Play = icon('Play');
export const Plus = icon('Plus');
export const Power = icon('Power');
export const RefreshCw = icon('RefreshCw');
export const RotateCcw = icon('RotateCcw');
export const Save = icon('Save');
export const ScanSearch = icon('ScanSearch');
export const Search = icon('Search');
export const Settings = icon('Settings');
export const ShieldAlert = icon('ShieldAlert');
export const ShieldCheck = icon('ShieldCheck');
export const SlidersHorizontal = icon('SlidersHorizontal');
export const Sparkles = icon('Sparkles');
export const Square = icon('Square');
export const Star = icon('Star');
export const Swords = icon('Swords');
export const Timer = icon('Timer');
export const Trash2 = icon('Trash2');
export const Trophy = icon('Trophy');
export const User = icon('User');
export const Users = icon('Users');
export const Volume2 = icon('Volume2');
export const VolumeX = icon('VolumeX');
export const X = icon('X');
export const Zap = icon('Zap');
