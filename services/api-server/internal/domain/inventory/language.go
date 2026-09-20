package inventory

import (
	"errors"
	"strings"
)

var ErrUnknownLanguage = errors.New("unknown language")

// Language is a supported programming language. Values are always stored in
// their canonical lowercase form.
type Language string

const (
	LanguageC           Language = "c"
	LanguageCPlusPlus   Language = "c++"
	LanguageCSharp      Language = "c#"
	LanguageGo          Language = "go"
	LanguageJava        Language = "java"
	LanguageJavaScript  Language = "javascript"
	LanguageTypeScript  Language = "typescript"
	LanguagePython      Language = "python"
	LanguageRuby        Language = "ruby"
	LanguagePHP         Language = "php"
	LanguageRust        Language = "rust"
	LanguageSwift       Language = "swift"
	LanguageKotlin      Language = "kotlin"
	LanguageScala       Language = "scala"
	LanguageDart        Language = "dart"
	LanguageLua         Language = "lua"
	LanguagePerl        Language = "perl"
	LanguageR           Language = "r"
	LanguageObjectiveC  Language = "objective-c"
	LanguageShell       Language = "shell"
	LanguageBash        Language = "bash"
	LanguagePowerShell  Language = "powershell"
	LanguageSQL         Language = "sql"
	LanguageSolidity    Language = "solidity"
	LanguageHaskell     Language = "haskell"
	LanguageElixir      Language = "elixir"
	LanguageErlang      Language = "erlang"
	LanguageClojure     Language = "clojure"
	LanguageGroovy      Language = "groovy"
	LanguageFortran     Language = "fortran"
	LanguageCOBOL       Language = "cobol"
	LanguageAssembly    Language = "assembly"
	LanguageVisualBasic Language = "visual-basic"
	LanguageMATLAB      Language = "matlab"
	LanguagePascal      Language = "pascal"
	LanguageDelphi      Language = "delphi"
	LanguageFSharp      Language = "f#"
	LanguageJulia       Language = "julia"
	LanguageZig         Language = "zig"
	LanguageNim         Language = "nim"
	LanguageOCaml       Language = "ocaml"
	LanguageProlog      Language = "prolog"
	LanguageCommonLisp  Language = "common-lisp"
	LanguageScratch     Language = "scratch"
)

func NewLanguage(value string) (Language, error) {
	normalized := Language(strings.ToLower(strings.TrimSpace(value)))
	if !isValidLanguage(normalized) {
		return "", ErrUnknownLanguage
	}
	return normalized, nil
}

func isValidLanguage(language Language) bool {
	switch language {
	case LanguageC,
		LanguageCPlusPlus,
		LanguageCSharp,
		LanguageGo,
		LanguageJava,
		LanguageJavaScript,
		LanguageTypeScript,
		LanguagePython,
		LanguageRuby,
		LanguagePHP,
		LanguageRust,
		LanguageSwift,
		LanguageKotlin,
		LanguageScala,
		LanguageDart,
		LanguageLua,
		LanguagePerl,
		LanguageR,
		LanguageObjectiveC,
		LanguageShell,
		LanguageBash,
		LanguagePowerShell,
		LanguageSQL,
		LanguageSolidity,
		LanguageHaskell,
		LanguageElixir,
		LanguageErlang,
		LanguageClojure,
		LanguageGroovy,
		LanguageFortran,
		LanguageCOBOL,
		LanguageAssembly,
		LanguageVisualBasic,
		LanguageMATLAB,
		LanguagePascal,
		LanguageDelphi,
		LanguageFSharp,
		LanguageJulia,
		LanguageZig,
		LanguageNim,
		LanguageOCaml,
		LanguageProlog,
		LanguageCommonLisp,
		LanguageScratch:
		return true
	default:
		return false
	}
}
