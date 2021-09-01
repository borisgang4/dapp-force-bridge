pragma solidity >=0.8.0;

contract Words {
  uint public total;
  
  mapping(uint => Word) public idToWord;
  
  constructor() {
    total=0;
  }
  event WordCreated(uint id,address owner,string word);
  
  struct Word{
    uint id;
    address owner;
    string word;
  }
  
  function assignWord(string memory _word) public {
    total++;
    uint id = total;
    idToWord[id] = Word(id,msg.sender,_word);
    emit WordCreated(id,msg.sender, _word);
  }
  
}