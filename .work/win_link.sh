#!/bin/bash

# mslink: Allow to create Windows Shortcut without the need of Windows
# 
# Copyright (C) 2019 Mikaël Le Bohec
# 
# This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
# 
# This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
# 
# You should have received a copy of the GNU General Public License along with this program. If not, see http://www.gnu.org/licenses/.

#############################################################################################
# mslink.sh v1.3
#############################################################################################
# Ce script permet de créer un Raccourci Windows (Fichier .LNK)
# Script créé en se basant sur la doc 
#   http://msdn.microsoft.com/en-us/library/dd871305.aspx
#############################################################################################

OPTIONS=$(getopt -q -n ${0} -o hpl:o:n:w:a:i: -l help,lnk-target:,output-file:,name:,working-dir:,arguments:,icon:,printer-link -- "$@")

eval set -- ${OPTIONS}

IS_PRINTER_LNK=0
while true; do
  case "$1" in
    -h|--help) HELP=1 ;;
    -p|--printer-link) IS_PRINTER_LNK=1 ;;
    -l|--lnk-target) LNK_TARGET="$2" ; shift ;;
    -o|--output-file) OUTPUT_FILE="$2" ; shift ;;
    -n|--name) param_HasName="$2" ; shift ;;
    -w|--working-dir) param_HasWorkingDir="$2" ; shift ;;
    -a|--arguments) param_HasArguments="$2" ; shift ;;
    -i|--icon) param_HasIconLocation="$2" ; shift ;;
    --)        shift ; break ;;
    *)         echo "Option inconnue : $1" ; exit 1 ;;
  esac
  shift
done

if [ $# -ne 0 ]; then
  echo "Option(s) inconnue(s) : $@"
  exit 1
fi

[ ${#LNK_TARGET} -eq 0 ] || [ ${#OUTPUT_FILE} -eq 0 ] && echo "
Usage :
 ${0} -l cible_du_fichier_lnk [-n description] [-w working_dir] [-a cmd_args] [-i icon_path] -o mon_fichier.lnk [-p]

Options :
 -l, --lnk-target               Précise la cible du raccourci
 -o, --output-file              Enregistre le raccourci dans un fichier
 -n, --name                     Spécifie une description au raccourci
 -w, --working-dir              Spécifie le répertoire de lancement de la commande
 -a, --arguments                Spécifie les arguments de la commande lancée
 -i, --icon                     Spécifie le chemin de l'icône
 -p, --printer-link             Génère un raccourci de type imprimante réseau
" && exit 1

#############################################################################################
# Fonctions
#############################################################################################

function ascii2hex() {
	echo $(echo -n ${1} | hexdump -v -e '/1 " x%02x"'|sed s/\ /\\\\/g)
}

function gen_LinkFlags() {
	echo '\x'$(printf '%02x' "$((HasLinkTargetIDList + HasName + HasWorkingDir + HasArguments + HasIconLocation))")${LinkFlags_2_3_4}
}

function gen_Data_string() {
        ITEM_SIZE=$(printf '%04x' $((${#1})))
        echo '\x'${ITEM_SIZE:2:2}'\x'${ITEM_SIZE:0:2}$(ascii2hex ${1})
}

function gen_IDLIST() {
        ITEM_SIZE=$(printf '%04x' $((${#1}/4+2)))
        echo '\x'${ITEM_SIZE:2:2}'\x'${ITEM_SIZE:0:2}${1}
}

function convert_CLSID_to_DATA() {
	echo -n ${1:6:2}${1:4:2}${1:2:2}${1:0:2}${1:11:2}${1:9:2}${1:16:2}${1:14:2}${1:19:4}${1:24:12}|sed s/"\([A-Fa-f0-9][A-Fa-f0-9]\)"/\\\\x\\1/g
}

#############################################################################################
# Variables issues de la documentation officielle de Microsoft
#############################################################################################

HasLinkTargetIDList=0x01
HasName=0x04
HasWorkingDir=0x10
HasArguments=0x20
HasIconLocation=0x40

HeaderSize='\x4c\x00\x00\x00'							# HeaderSize
LinkCLSID=$(convert_CLSID_to_DATA "00021401-0000-0000-c000-000000000046")	# LinkCLSID
LinkFlags_2_3_4='\x01\x00\x00'							# ForceNoLinkInfo 
LinkFlags=""

FileAttributes_Directory='\x10\x00\x00\x00'					# FILE_ATTRIBUTE_DIRECTORY
FileAttributes_File='\x20\x00\x00\x00'						# FILE_ATTRIBUTE_ARCHIVE

CreationTime='\x00\x00\x00\x00\x00\x00\x00\x00'
AccessTime='\x00\x00\x00\x00\x00\x00\x00\x00'
WriteTime='\x00\x00\x00\x00\x00\x00\x00\x00'

FileSize='\x00\x00\x00\x00'
IconIndex='\x00\x00\x00\x00'
ShowCommand='\x01\x00\x00\x00'							# SW_SHOWNORMAL
Hotkey='\x00\x00'								# No Hotkey
Reserved='\x00\x00'								# Valeur non modifiable
Reserved2='\x00\x00\x00\x00'							# Valeur non modifiable
Reserved3='\x00\x00\x00\x00'							# Valeur non modifiable
TerminalID='\x00\x00'								# Valeur non modifiable

CLSID_Computer="20d04fe0-3aea-1069-a2d8-08002b30309d"				# Poste de travail
CLSID_Network="208d2c60-3aea-1069-a2d7-08002b30309d"				# Favoris réseau

#############################################################################################
# Constantes trouvées à partir de l'analyse de fichiers lnk
#############################################################################################

PREFIX_LOCAL_ROOT='\x2f'							# Disque local
PREFIX_FOLDER='\x31\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'		# Dossier de fichiers
PREFIX_FILE='\x32\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'			# Fichier
PREFIX_NETWORK_ROOT='\xc3\x01\x81'						# Racine de serveur de fichiers réseau
PREFIX_NETWORK_PRINTER='\xc3\x02\xc1'						# Imprimante réseau

END_OF_STRING='\x00'

#############################################################################################

if [ ! -z "${param_HasName}" ]; then
	STRING_DATA=${STRING_DATA}$(gen_Data_string ${param_HasName})
else
	HasName=0x00
fi
if [ ! -z "${param_HasWorkingDir}" ]; then
	STRING_DATA=${STRING_DATA}$(gen_Data_string ${param_HasWorkingDir})
else
	HasWorkingDir=0x00
fi
if [ ! -z "${param_HasArguments}" ]; then
	STRING_DATA=${STRING_DATA}$(gen_Data_string ${param_HasArguments})
else
	HasArguments=0x00
fi
if [ ! -z "${param_HasIconLocation}" ]; then
	STRING_DATA=${STRING_DATA}$(gen_Data_string ${param_HasIconLocation})
else
	HasIconLocation=0x00
fi

LinkFlags=$(gen_LinkFlags)

# On retire l'anti-slash final s'il y en a un
LNK_TARGET=${LNK_TARGET%\\}

# On sépare le chemin racine du lien de la cible finale
# On distingue aussi si le lien est de type local ou réseau
# On définie la valeur Item_Data suivant le cas d'un lien réseau ou local

IS_ROOT_LNK=0
IS_NETWORK_LNK=0

if [[ ${LNK_TARGET} == \\\\* ]]; then
	IS_NETWORK_LNK=1
	PREFIX_ROOT=${PREFIX_NETWORK_ROOT}
	Item_Data='\x1f\x58'$(convert_CLSID_to_DATA ${CLSID_Network})

        TARGET_ROOT=${LNK_TARGET%\\*}
        if [[ ${LNK_TARGET} == \\\\*\\* ]]; then
                TARGET_LEAF=${LNK_TARGET##*\\}
        fi
        if [ ${TARGET_ROOT} == \\ ]; then
                TARGET_ROOT=${LNK_TARGET}
        fi
else
	PREFIX_ROOT=${PREFIX_LOCAL_ROOT}
	Item_Data='\x1f\x50'$(convert_CLSID_to_DATA ${CLSID_Computer})

	TARGET_ROOT=${LNK_TARGET%%\\*}
        if [[ ${LNK_TARGET} == *\\* ]]; then
		TARGET_LEAF=${LNK_TARGET#*\\}
        fi
	[[ ! ${TARGET_ROOT} == *\\ ]] && TARGET_ROOT=${TARGET_ROOT}'\'
fi

if [ ${IS_PRINTER_LNK} -eq 1 ]; then
	PREFIX_ROOT=${PREFIX_NETWORK_PRINTER}
	TARGET_ROOT=${LNK_TARGET}
	IS_ROOT_LNK=1
fi

[ ${#TARGET_LEAF} -eq 0 ] && IS_ROOT_LNK=1

#############################################################################################

# On sélectionne le préfixe qui sera utilisé pour afficher l'icône du raccourci

if [[ ${TARGET_LEAF} == *.??? ]]; then
	PREFIX_OF_TARGET=${PREFIX_FILE}
	TYPE_TARGET="fichier"
	FileAttributes=${FileAttributes_File}
else
	PREFIX_OF_TARGET=${PREFIX_FOLDER}
	TYPE_TARGET="dossier"
	FileAttributes=${FileAttributes_Directory}
fi

# On convertit les valeurs des cibles en binaire
TARGET_ROOT=$(ascii2hex "${TARGET_ROOT}")
TARGET_ROOT=${TARGET_ROOT}$(for i in `seq 1 21`;do echo -n '\x00';done) # Nécessaire à partir de Vista et supérieur sinon le lien est considéré comme vide (je n'ai trouvé nul part d'informations à ce sujet)

TARGET_LEAF=$(ascii2hex "${TARGET_LEAF}")

# On crée l'IDLIST qui représente le cœur du fichier LNK

if [ ${IS_ROOT_LNK} -eq 1 ];then
	IDLIST_ITEMS=$(gen_IDLIST ${Item_Data})$(gen_IDLIST ${PREFIX_ROOT}${TARGET_ROOT}${END_OF_STRING})
else
	IDLIST_ITEMS=$(gen_IDLIST ${Item_Data})$(gen_IDLIST ${PREFIX_ROOT}${TARGET_ROOT}${END_OF_STRING})$(gen_IDLIST ${PREFIX_OF_TARGET}${TARGET_LEAF}${END_OF_STRING})
fi

IDLIST=$(gen_IDLIST ${IDLIST_ITEMS})

#############################################################################################

if [ ${IS_NETWORK_LNK} -eq 1 ]; then
	TYPE_LNK="réseau"
	if [ ${IS_PRINTER_LNK} -eq 1 ]; then
		TYPE_TARGET="imprimante"
	fi
else
	TYPE_LNK="local"
fi

echo "Création d'un raccourci de type \""${TYPE_TARGET}" "${TYPE_LNK}"\" avec pour cible "${LNK_TARGET} ${param_HasArguments} 1>&2

echo -ne ${HeaderSize}${LinkCLSID}${LinkFlags}${FileAttributes}${CreationTime}${AccessTime}${WriteTime}${FileSize}${IconIndex}${ShowCommand}${Hotkey}${Reserved}${Reserved2}${Reserved3}${IDLIST}${TerminalID}${STRING_DATA} > "${OUTPUT_FILE}"

