# Athena/Glue objects that were created by hand in the console on 2026-11-26 and then imported here.
# This file only DESCRIBES what already exists (terraform import + a plan with no changes).
# Not managed here on purpose: the Athena workgroup, query results, and the S3 files themselves.

resource "aws_glue_catalog_database" "nba" {
  name = "nba"
}

# CSV files in s3://<bucket>/processed/player_game_stats/ read as a table by Athena.
resource "aws_glue_catalog_table" "player_game_stats" {
  name          = "player_game_stats"
  database_name = aws_glue_catalog_database.nba.name
  table_type    = "EXTERNAL_TABLE"

  # Athena fills these in itself when it runs CREATE TABLE (owner "hadoop", a last-DDL timestamp,
  # bucket and skew defaults). We didn't write them, so Terraform shouldn't try to remove them.
  lifecycle {
    ignore_changes = [
      owner,
      parameters,
      storage_descriptor[0].number_of_buckets,
      storage_descriptor[0].skewed_info,
    ]
  }

  parameters = {
    EXTERNAL                 = "TRUE"
    "skip.header.line.count" = "1" # the CSV's first line is the header
    # Blank percentage cells (no shot attempts) are real NULLs in our data. Without this, Athena
    # fails with "NumberFormatException: empty String" on any query that reads fg_pct/fg3_pct/ft_pct.
    "use.null.for.invalid.data" = "true"
  }

  storage_descriptor {
    location      = "s3://${aws_s3_bucket.app_bucket.bucket}/processed/player_game_stats"
    input_format  = "org.apache.hadoop.mapred.TextInputFormat"
    output_format = "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat"

    ser_de_info {
      serialization_library = "org.apache.hadoop.hive.serde2.OpenCSVSerde"
      parameters = {
        separatorChar          = ","
        quoteChar              = "\""
        escapeChar             = "\\"
        "serialization.format" = "1"
      }
    }

    columns {
      name = "game_id"
      type = "string"
    }

    columns {
      name = "player_id"
      type = "string"
    }

    columns {
      name = "team_id"
      type = "string"
    }

    columns {
      name = "is_home"
      type = "string"
    }

    columns {
      name = "zero_minutes"
      type = "string"
    }

    columns {
      name = "wl"
      type = "string"
    }

    columns {
      name = "min"
      type = "double"
    }

    columns {
      name = "fgm"
      type = "int"
    }

    columns {
      name = "fga"
      type = "int"
    }

    columns {
      name = "fg3m"
      type = "int"
    }

    columns {
      name = "fg3a"
      type = "int"
    }

    columns {
      name = "ftm"
      type = "int"
    }

    columns {
      name = "fta"
      type = "int"
    }

    columns {
      name = "oreb"
      type = "int"
    }

    columns {
      name = "dreb"
      type = "int"
    }

    columns {
      name = "reb"
      type = "int"
    }

    columns {
      name = "ast"
      type = "int"
    }

    columns {
      name = "stl"
      type = "int"
    }

    columns {
      name = "blk"
      type = "int"
    }

    columns {
      name = "tov"
      type = "int"
    }

    columns {
      name = "pf"
      type = "int"
    }

    columns {
      name = "pts"
      type = "int"
    }

    columns {
      name = "plus_minus"
      type = "int"
    }

    columns {
      name = "fg_pct"
      type = "double"
    }

    columns {
      name = "fg3_pct"
      type = "double"
    }

    columns {
      name = "ft_pct"
      type = "double"
    }

    columns {
      name = "fantasy_pts"
      type = "double"
    }
  }
}
