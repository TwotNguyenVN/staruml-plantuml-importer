param(
    [Parameter(Mandatory = $true)][ValidateSet('Install', 'Remove')][string]$Action,
    [string]$Name = 'twot.staruml-plantuml-importer',
    [string]$Root,
    [string]$RelativeDestination,
    [switch]$TestMode,
    [switch]$FailAtomicRenameForTest,
    [switch]$FailPromotionForTest
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0

$AllowedNames = @(
    'twot.staruml-plantuml-importer',
    'staruml-plantuml-importer',
    'staruml-usecase-importer'
)
$Manifest = @(
    'PlantUML_Importer.png', 'main.js', 'package.json',
    'menus\menu.json', 'keymaps\keymap.json',
    'utils\dialog-helper.js', 'utils\parser-helper.js',
    'utils\preview-helper.js', 'utils\input-guard.js',
    'parsers\usecase-parser.js', 'parsers\class-parser.js',
    'parsers\sequence-parser.js', 'parsers\activity-parser.js',
    'parsers\state-parser.js', 'parsers\erd-parser.js',
    'parsers\mindmap-parser.js', 'parsers\requirement-parser.js'
)

function Test-EqualPath([string]$Left, [string]$Right) {
    return [String]::Equals($Left.TrimEnd('\'), $Right.TrimEnd('\'), [StringComparison]::OrdinalIgnoreCase)
}

function Assert-AllowedName([string]$Candidate) {
    if ($AllowedNames -notcontains $Candidate -or
        [IO.Path]::IsPathRooted($Candidate) -or
        $Candidate.IndexOfAny(@([char]'\', [char]'/')) -ge 0 -or
        $Candidate -eq '.' -or $Candidate -eq '..') {
        throw 'Refusing unknown or unsafe extension name.'
    }
}

function Assert-SafeRelativePath([string]$Candidate) {
    if (!$Candidate -or [IO.Path]::IsPathRooted($Candidate)) {
        throw 'Relative destination must be a non-rooted manifest path.'
    }
    $parts = $Candidate -split '[\\/]'
    $unsafeParts = @($parts | Where-Object { !$_ -or $_ -eq '.' -or $_ -eq '..' })
    if ($parts.Count -eq 0 -or $unsafeParts.Count -gt 0) {
        throw 'Relative destination contains an unsafe path segment.'
    }
}

function Assert-NormalizedAbsolutePath([string]$Candidate) {
    if (!$Candidate -or ![IO.Path]::IsPathRooted($Candidate)) {
        throw 'Extension root must be absolute.'
    }
    $full = [IO.Path]::GetFullPath($Candidate)
    if (!(Test-EqualPath $Candidate $full)) {
        throw 'Extension root must be lexically normalized.'
    }
    return $full.TrimEnd('\')
}

function Assert-NoReparseInExistingPath([string]$PathToCheck) {
    $fullPath = [IO.Path]::GetFullPath($PathToCheck)
    $pathRoot = [IO.Path]::GetPathRoot($fullPath)
    $current = $pathRoot
    $relative = $fullPath.Substring($pathRoot.Length)
    foreach ($part in $relative.Split([IO.Path]::DirectorySeparatorChar, [StringSplitOptions]::RemoveEmptyEntries)) {
        $current = Join-Path $current $part
        $item = Get-Item -LiteralPath $current -Force -ErrorAction SilentlyContinue
        if ($item -and ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
            throw 'Refusing symbolic link, junction, or reparse point in the path chain.'
        }
    }
}

function Assert-RootBeforeCreation([string]$RootPath) {
    $rootFull = Assert-NormalizedAbsolutePath $RootPath
    Assert-NoReparseInExistingPath $rootFull
    $nearest = $rootFull
    while (!(Test-Path -LiteralPath $nearest)) {
        $parent = [IO.Path]::GetDirectoryName($nearest)
        if (!$parent -or (Test-EqualPath $parent $nearest)) { break }
        $nearest = $parent
    }
    $nearestItem = Get-Item -LiteralPath $nearest -Force
    if (!$nearestItem.PSIsContainer -or ($nearestItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
        throw 'Nearest existing root ancestor is invalid or linked.'
    }
    $resolvedNearest = [IO.Path]::GetFullPath((Resolve-Path -LiteralPath $nearest).Path)
    if (!(Test-EqualPath $nearest $resolvedNearest)) {
        throw 'Nearest existing root ancestor is not canonical.'
    }
    if (!(Test-EqualPath $rootFull $nearest) -and
        !$rootFull.StartsWith($nearest.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Intended extension root escapes its existing ancestor.'
    }
    return $rootFull
}

function Assert-CanonicalRoot([string]$RootPath) {
    $rootFull = Assert-RootBeforeCreation $RootPath
    if (Test-Path -LiteralPath $rootFull) {
        $rootItem = Get-Item -LiteralPath $rootFull -Force
        if (!$rootItem.PSIsContainer -or ($rootItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
            throw 'Extension root is invalid or linked.'
        }
        $resolvedRoot = [IO.Path]::GetFullPath((Resolve-Path -LiteralPath $rootFull).Path)
        if (!(Test-EqualPath $rootFull $resolvedRoot)) { throw 'Extension root is not canonical.' }
    }
    return $rootFull
}

function Assert-ExactTarget([string]$RootPath, [string]$TargetPath, [string]$ExpectedName) {
    Assert-AllowedName $ExpectedName
    $rootFull = [IO.Path]::GetFullPath($RootPath).TrimEnd('\')
    $targetFull = [IO.Path]::GetFullPath($TargetPath).TrimEnd('\')
    $targetParent = [IO.Path]::GetDirectoryName($targetFull)
    $targetName = [IO.Path]::GetFileName($targetFull)
    $combined = [IO.Path]::GetFullPath([IO.Path]::Combine($rootFull, $ExpectedName)).TrimEnd('\')
    if (!(Test-EqualPath $targetParent $rootFull) -or
        ![String]::Equals($targetName, $ExpectedName, [StringComparison]::Ordinal) -or
        !(Test-EqualPath $targetFull $combined)) {
        throw 'Extension target must be the exact immediate child of the normalized root.'
    }
}

function Assert-NoReparseTree([string]$Directory) {
    $linked = Get-ChildItem -LiteralPath $Directory -Recurse -Force | Where-Object {
        ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0
    } | Select-Object -First 1
    if ($linked) { throw 'Private staging tree contains a reparse point.' }
}

function Test-EntryExists([string]$Entry) {
    return $null -ne (Get-Item -LiteralPath $Entry -Force -ErrorAction SilentlyContinue)
}

function Move-EntryAtomic([string]$SourcePath, [string]$DestinationPath) {
    if ($TestMode -and $FailAtomicRenameForTest) { throw 'Atomic rename failure injected for isolated testing.' }
    if (Test-EntryExists $DestinationPath) { throw 'Atomic rename destination already exists.' }
    $item = Get-Item -LiteralPath $SourcePath -Force
    if ($item.PSIsContainer) {
        [IO.Directory]::Move($SourcePath, $DestinationPath)
    } else {
        [IO.File]::Move($SourcePath, $DestinationPath)
    }
}

function Promote-StagingAtomic([string]$SourcePath, [string]$DestinationPath) {
    if ($TestMode -and $FailPromotionForTest) { throw 'Staging promotion failure injected for isolated testing.' }
    Move-EntryAtomic $SourcePath $DestinationPath
}

function Remove-EntryNoFollow([string]$Entry) {
    $item = Get-Item -LiteralPath $Entry -Force -ErrorAction SilentlyContinue
    if (!$item) { return }
    if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
        if ($item.PSIsContainer) { [IO.Directory]::Delete($Entry) }
        else { [IO.File]::Delete($Entry) }
    } elseif ($item.PSIsContainer) {
        Get-ChildItem -LiteralPath $Entry -Force | ForEach-Object { Remove-EntryNoFollow $_.FullName }
        [IO.Directory]::Delete($Entry)
    } else {
        [IO.File]::Delete($Entry)
    }
}

function New-PrivateEntryPath([string]$RootPath, [string]$Kind) {
    do {
        $leaf = '.twot.staruml-plantuml-importer.' + $Kind + '.' + [Guid]::NewGuid().ToString('N')
        $candidate = Join-Path $RootPath $leaf
    } while (Test-EntryExists $candidate)
    return $candidate
}

function Populate-StagingManifest([string]$SourceRoot, [string]$Staging) {
    foreach ($relative in $Manifest) {
        Assert-SafeRelativePath $relative
        $source = Join-Path $SourceRoot $relative
        $sourceItem = Get-Item -LiteralPath $source -Force
        if ($sourceItem.PSIsContainer -or ($sourceItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
            throw 'Runtime manifest source is invalid or linked.'
        }
        $destination = Join-Path $Staging $relative
        $destinationFull = [IO.Path]::GetFullPath($destination)
        if (!$destinationFull.StartsWith($Staging.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase)) {
            throw 'Manifest destination escapes private staging.'
        }
        [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($destinationFull)) | Out-Null
        [IO.File]::Copy($source, $destinationFull, $false)
    }
}

function Remove-ExtensionAtomic([string]$RootPath, [string]$ExtensionName) {
    $rootFull = Assert-CanonicalRoot $RootPath
    if (!(Test-Path -LiteralPath $rootFull)) { return }
    $target = Join-Path $rootFull $ExtensionName
    Assert-ExactTarget $rootFull $target $ExtensionName
    if (!(Test-EntryExists $target)) { return }
    $targetItem = Get-Item -LiteralPath $target -Force
    if (($targetItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
        throw 'Refusing removal of a linked extension target.'
    }
    $quarantine = New-PrivateEntryPath $rootFull 'quarantine'
    Move-EntryAtomic $target $quarantine
    $renamed = Get-Item -LiteralPath $quarantine -Force
    if (!$renamed) { throw 'Quarantined entry could not be inspected.' }
    Remove-EntryNoFollow $quarantine
}

function Install-ExtensionAtomic([string]$RootPath, [string]$ExtensionName) {
    if ($ExtensionName -ne 'twot.staruml-plantuml-importer') {
        throw 'Only the current extension name can be installed.'
    }
    $rootFull = Assert-CanonicalRoot $RootPath
    [IO.Directory]::CreateDirectory($rootFull) | Out-Null
    $rootFull = Assert-CanonicalRoot $rootFull
    $target = Join-Path $rootFull $ExtensionName
    Assert-ExactTarget $rootFull $target $ExtensionName
    if (Test-EntryExists $target) {
        $targetItem = Get-Item -LiteralPath $target -Force
        if (($targetItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
            throw 'Refusing installation over a linked extension target.'
        }
    }
    $staging = New-PrivateEntryPath $rootFull 'staging'
    [IO.Directory]::CreateDirectory($staging) | Out-Null
    $quarantine = $null
    try {
        Populate-StagingManifest ([IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))) $staging
        Assert-NoReparseTree $staging
        $rootFull = Assert-CanonicalRoot $rootFull
        if (Test-EntryExists $target) {
            $quarantine = New-PrivateEntryPath $rootFull 'quarantine'
            Move-EntryAtomic $target $quarantine
        }
        try {
            Promote-StagingAtomic $staging $target
        } catch {
            if ($quarantine -and !(Test-EntryExists $target)) {
                Move-EntryAtomic $quarantine $target
                $quarantine = $null
            }
            throw
        }
        if ($quarantine) {
            $renamed = Get-Item -LiteralPath $quarantine -Force
            if (!$renamed) { throw 'Quarantined entry could not be inspected.' }
            Remove-EntryNoFollow $quarantine
            $quarantine = $null
        }
    } finally {
        if (Test-EntryExists $staging) { Remove-EntryNoFollow $staging }
    }
}

function Assert-TestRootIsolated([string]$TestRoot, [string]$ProductionRoot) {
    $testFull = [IO.Path]::GetFullPath($TestRoot).TrimEnd('\')
    $productionFull = [IO.Path]::GetFullPath($ProductionRoot).TrimEnd('\')
    $testInsideProduction = (Test-EqualPath $testFull $productionFull) -or
        $testFull.StartsWith($productionFull + '\', [StringComparison]::OrdinalIgnoreCase)
    $productionInsideTest = $productionFull.StartsWith($testFull + '\', [StringComparison]::OrdinalIgnoreCase)
    if ($testInsideProduction -or $productionInsideTest) {
        throw 'Dedicated test root must be disjoint from the production extension root.'
    }
}

Assert-AllowedName $Name
if ($RelativeDestination) { Assert-SafeRelativePath $RelativeDestination }
$ProductionRoot = Assert-NormalizedAbsolutePath (
    Join-Path ([Environment]::GetFolderPath('ApplicationData')) 'StarUML\extensions\user'
)
if (!$TestMode -and ($FailAtomicRenameForTest -or $FailPromotionForTest)) {
    throw 'Test-only failure controls require dedicated test mode.'
}
if ($TestMode) {
    if (!$Root) { throw 'Dedicated test mode requires an explicit isolated root.' }
    $Root = Assert-NormalizedAbsolutePath $Root
    Assert-TestRootIsolated $Root $ProductionRoot
} else {
    if ($Root) { throw 'Explicit root is allowed only in dedicated test mode.' }
    $Root = $ProductionRoot
}

if ($Action -eq 'Install') {
    Install-ExtensionAtomic $Root $Name
} else {
    Remove-ExtensionAtomic $Root $Name
}
