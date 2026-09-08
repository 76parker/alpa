package inventory

import (
	"strings"
	"unicode"
)

const (
	allowedSymbols        = "- ._()@+:/#&',%[]"
	maxDefaultFieldLength = 50
)

func isValidField(name string, maxLength int, canBeEmpty bool) bool {
	if !canBeEmpty && name == "" {
		return false
	}

	length := 0

	for _, r := range name {
		length++

		if length > maxLength || !isAllowedNameRune(r) {
			return false
		}
	}

	return true
}
func isAllowedNameRune(r rune) bool {
	return unicode.IsLetter(r) ||
		unicode.IsNumber(r) ||
		strings.ContainsRune(allowedSymbols, r)
}
