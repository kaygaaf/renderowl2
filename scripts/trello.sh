#!/bin/bash
# Trello CLI wrapper

TRELLO_KEY="9035f71851deb35bb92d2715c84867a3"
TRELLO_TOKEN="f075d24b941a1fb8741b593733b7202a660330941873e1d0053146ac7775e667"
BASE_URL="https://api.trello.com/1"

# Function to make Trello API calls
trello_api() {
    local method=$1
    local endpoint=$2
    shift 2
    local data="$@"
    
    curl -s -X "$method" \
        "${BASE_URL}${endpoint}?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}${data}" \
        -H "Accept: application/json"
}

# Commands
case "$1" in
    boards)
        trello_api GET "/members/me/boards"
        ;;
    create-board)
        trello_api POST "/boards" "&name=$2&desc=$3"
        ;;
    lists)
        trello_api GET "/boards/$2/lists"
        ;;
    create-list)
        trello_api POST "/boards/$2/lists" "&name=$3"
        ;;
    cards)
        trello_api GET "/lists/$2/cards"
        ;;
    create-card)
        trello_api POST "/cards" "&idList=$2&name=$3&desc=$4"
        ;;
    *)
        echo "Usage: $0 {boards|create-board|lists|create-list|cards|create-card}"
        ;;
esac