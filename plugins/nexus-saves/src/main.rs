use std::{io::{self, Read}, path::PathBuf};
use ludusavi::{api::{Ludusavi, Config, Manifest, StrictPath, TitleQuery, Finality, parameters}, resource::{config::Root, manifest::Store}};
use serde::Deserialize;
use serde_json::{Value, json};

#[derive(Deserialize)]
#[serde(rename_all="camelCase", deny_unknown_fields)]
struct Command {
    #[serde(rename="type")] kind: String,
    data: String,
    destination: String,
    title: String,
    steam_id: Option<u32>,
    root: Option<String>,
    version: Option<String>,
}

fn engine(command: &Command, recovery: bool) -> Result<Ludusavi, &'static str> {
    if !PathBuf::from(&command.data).is_absolute() || !PathBuf::from(&command.destination).is_absolute() || command.title.trim().is_empty() { return Err("invalid-command"); }
    *ludusavi::prelude::CONFIG_DIR.lock().map_err(|_| "engine-unavailable")? = Some(PathBuf::from(&command.data));
    let manifest = Manifest::load().map_err(|_| "manifest-unavailable")?;
    if manifest.0.is_empty() { return Err("manifest-unavailable"); }
    let mut config = Config::default();
    let target = if recovery { format!("{}/Recovery", command.destination) } else { command.destination.clone() };
    config.backup.path = StrictPath::new(target.clone());
    config.restore.path = StrictPath::new(target);
    config.backup.retention.full = 5;
    config.backup.retention.differential = 0;
    config.backup.retention.force_new_full = true;
    config.backup.filter.exclude_store_screenshots = true;
    config.cloud.synchronize = false;
    config.release.check = false;
    config.add_common_roots();
    if let Some(root) = &command.root { config.roots.push(Root::new(StrictPath::new(root.clone()), Store::OtherWindows)); }
    Ok(Ludusavi::new(config, manifest))
}

fn summarize(output: ludusavi::api::ApiOutput, title: &str) -> Result<Value, &'static str> {
    let output=serde_json::to_value(output).map_err(|_| "invalid-engine-response")?;
    if output.get("errors").is_some_and(|x| !x.is_null() && x.as_object().is_some_and(|x| !x.is_empty())) { return Err("partial-backup"); }
    let game=&output["games"][title];
    let files=game["files"].as_object();
    let registry=game["registry"].as_object();
    if files.is_some_and(|x| x.values().any(|f| f["failed"]==true)) || registry.is_some_and(|x| x.values().any(|r| r["failed"]==true || r["values"].as_object().is_some_and(|v| v.values().any(|x| x["failed"]==true)))) { return Err("partial-backup"); }
    let count=files.map_or(0, |x| x.values().filter(|f| f["ignored"]!=true && f["change"]!="Removed").count());
    let keys=registry.map_or(0, |x| x.values().filter(|r| r["ignored"]!=true && r["change"]!="Removed").count());
    let bytes:u64=files.map_or(0, |x| x.values().filter(|f| f["ignored"]!=true).map(|f| f["bytes"].as_u64().unwrap_or(0)).sum());
    Ok(json!({"ok":true,"known":true,"files":count,"registry":keys,"bytes":bytes}))
}

fn execute(command: Command) -> Result<Value, &'static str> {
    if !["scan","backup","protect","list","restore-preview","restore"].contains(&command.kind.as_str()) { return Err("invalid-command"); }
    let mut engine=engine(&command, command.kind=="protect")?;
    // A verified store ID wins. Title matching is exact; no fuzzy guess can write files.
    let by_id=command.steam_id.map(|id| engine.find_title(TitleQuery{steam_id:Some(id), ..Default::default()})).unwrap_or_default();
    let matches=if by_id.is_empty(){engine.find_title(TitleQuery{names:vec![command.title.clone()],..Default::default()})}else{by_id};
    if matches.len()!=1 { return Ok(json!({"ok":true,"known":false,"files":0,"registry":0,"bytes":0,"versions":[]})); }
    let title=matches.keys().next().unwrap().clone();
    let games=vec![title.clone()];
    if command.kind=="list" {
        let output=match engine.list_backups(parameters::ListBackups{games}) {
            Ok(output)=>serde_json::to_value(output).map_err(|_| "invalid-engine-response")?,
            Err(ludusavi::prelude::Error::CliUnrecognizedGames{..})=>return Ok(json!({"ok":true,"known":true,"versions":[]})),
            Err(_)=>return Err("operation-failed"),
        };
        let backups=output["games"][&title]["backups"].as_array();
        let versions:Vec<Value>=backups.map(|x| x.iter().map(|v|json!({"id":v["name"],"when":v["when"]})).collect()).unwrap_or_default();
        return Ok(json!({"ok":true,"known":true,"versions":versions}));
    }
    let restore=command.kind.starts_with("restore");
    let finality=if command.kind=="scan"||command.kind=="restore-preview" {Finality::Preview}else{Finality::Final};
    let output=if restore {
        let version=command.version.filter(|x| !x.is_empty()).ok_or("invalid-version")?;
        engine.restore(parameters::Restore{games,finality,backup:Some(version),..Default::default()})
    } else { engine.back_up(parameters::BackUp{games,finality,..Default::default()}) }.map_err(|_| "operation-failed")?;
    summarize(output, &title)
}

fn main() {
    let mut input=String::new();
    let result=io::stdin().take(65537).read_to_string(&mut input).map_err(|_| "invalid-command")
        .and_then(|_| if input.len()>65536 {Err("invalid-command")}else{serde_json::from_str::<Command>(&input).map_err(|_| "invalid-command")})
        .and_then(execute);
    match result {Ok(value)=>println!("{value}"),Err(error)=>{println!("{}",json!({"ok":false,"error":error}));std::process::exit(1);}}
}

#[cfg(test)]
mod tests {
 use super::*;
 #[test]
 fn backup_and_restore_real_fixture() {
  let dir=std::env::temp_dir().join(format!("nexus-saves-fixture-{}",std::process::id()));
  std::fs::create_dir_all(dir.join("engine")).unwrap();
  let file=dir.join("save.dat");std::fs::write(&file,b"original progress").unwrap();
  let manifest=format!("Fixture Game:\n  files:\n    '{}': {{}}\n  steam:\n    id: 123\n",file.to_string_lossy().replace('\\',"/"));
  std::fs::write(dir.join("engine/manifest.yaml"),manifest).unwrap();
  let cmd=|kind:&str,version:Option<String>|Command{kind:kind.into(),data:dir.join("engine").to_string_lossy().into(),destination:dir.join("Nexus Saves").to_string_lossy().into(),title:"Fixture Game".into(),steam_id:Some(123),root:None,version};
  assert_eq!(execute(cmd("scan",None)).unwrap()["files"],1);
  assert_eq!(execute(cmd("backup",None)).unwrap()["files"],1);
  let versions=execute(cmd("list",None)).unwrap();
  let id=versions["versions"][0]["id"].as_str().unwrap().to_owned();
  std::fs::write(&file,b"new progress").unwrap();
  execute(cmd("protect",None)).unwrap();
  execute(cmd("restore-preview",Some(id.clone()))).unwrap();
  execute(cmd("restore",Some(id))).unwrap();
  assert_eq!(std::fs::read(&file).unwrap(),b"original progress");
  let versions=execute(cmd("list",None)).unwrap();
  let id=versions["versions"][0]["id"].as_str().unwrap().to_owned();
  std::fs::remove_file(&file).unwrap();
  assert_eq!(execute(cmd("protect",None)).unwrap()["files"],0);
  execute(cmd("restore",Some(id))).unwrap();
  assert_eq!(std::fs::read(&file).unwrap(),b"original progress");
  let mut unknown=cmd("scan",None);unknown.title="Unknown game".into();unknown.steam_id=None;
  assert_eq!(execute(unknown).unwrap()["known"],false);
  std::fs::remove_dir_all(dir).unwrap();
 }
}
